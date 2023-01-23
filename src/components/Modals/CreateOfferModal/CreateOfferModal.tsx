/* eslint-disable react/display-name */
import { FC, forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Flex, Group, Select, SelectItem, Stack, TextInput, Text, NumberInput as MantineInput, Skeleton, Tooltip } from '@mantine/core';
import { useForm } from '@mantine/form';
import { showNotification, updateNotification } from '@mantine/notifications';
import BigNumber from 'bignumber.js';
import { CoinBridgeToken, coinBridgeTokenABI } from 'src/abis';
import { ContractsID, NOTIFICATIONS, NotificationsID } from 'src/constants';
import { ZERO_ADDRESS } from 'src/constants';
import { useActiveChain } from 'src/hooks';
import { useContract } from 'src/hooks/useContract';
import { getContract } from 'src/utils';
import { NumberInput } from '../../NumberInput';
import { cleanNumber } from 'src/utils/number';
import { useWeb3React } from '@web3-react/core';
import { ContextModalProps } from '@mantine/modals';
import { useAppDispatch, useAppSelector } from 'src/hooks/react-hooks';
import { createOfferAddedDispatchType } from 'src/store/features/createOffers/createOffersSlice';
import { CreatedOffer } from 'src/types/offer/CreatedOffer';
import { selectCreateOffers } from 'src/store/features/createOffers/createOffersSelector';
import { useCreateOfferTokens } from 'src/hooks/useCreateOfferTokens';
import { OfferTypeBadge } from 'src/components/Offer/OfferTypeBadge';
import { OFFER_TYPE } from 'src/types/offer';
import { useOraclePriceFeed } from 'src/hooks/useOraclePriceFeed';
import { calcRem } from 'src/utils/style';
import { IconArrowRight, IconArrowsSort } from '@tabler/icons';
import { Shield } from 'src/components/Shield/Shield';
import { useWalletERC20Balance } from 'src/hooks/useWalletERC20Balance';
import { useShield } from 'src/hooks/useShield';
import { usePropertiesToken } from 'src/hooks/usePropertiesToken';

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string;
  uuid: string;
  value: string;
}

type CreateOfferModalProps = {
  offer: CreatedOffer
}

type SellFormValues = {
  offerTokenAddress: string;
  buyerTokenAddress: string;
  price: number|undefined;
  amount: number|undefined;
  buyerAddress: string;
  isPrivateOffer: boolean;
};

export const CreateOfferModal: FC<ContextModalProps<CreateOfferModalProps>> = ({
  context,
  id,
  innerProps: {
    offer
  },
}) => {
  
  const { t } = useTranslation('modals', { keyPrefix: 'sell' });
  const { account, provider } = useWeb3React();

  const { getInputProps, onSubmit, values, isValid, setFieldValue } =
    useForm<SellFormValues>({
      // eslint-disable-next-line object-shorthand
      initialValues: {
        offerTokenAddress: offer?.offerTokenAddress ?? '',
        buyerTokenAddress: offer?.buyerTokenAddress ?? '',
        price: offer?.price ?? undefined,
        amount: offer?.amount ?? undefined,
        buyerAddress: offer?.buyerAddress ?? ZERO_ADDRESS,
        isPrivateOffer: offer?.isPrivateOffer ?? false,
      },
      validate: {
        buyerAddress: (value) => (value == account ? t('invalidPrivateOfferAddress'): null),
      },
    });

    // TODO: add translate
    const realT = t("realtTokenType");
    const others = t("otherTokenType");
    const data = [{ value: realT, label: realT },{ value: others, label: others }];

  // const [isPrivateOffer, setIsPrivateOffer] = useState(false);
  const [isSubmitting, setSubmitting] = useState<boolean>(false);
  const activeChain = useActiveChain();

  const dispatch = useAppDispatch();
  const realTokenYamUpgradeable = useContract(ContractsID.realTokenYamUpgradeable);

  const offers = useAppSelector(selectCreateOffers);
  const [exchangeType,setExchangeType] = useState<string|null>(null);

  const approve = (formValues: SellFormValues): Promise<void> => {
    return new Promise<void>(async (resolve,reject) => {
      if(!provider || !realTokenYamUpgradeable || !account || !formValues.amount) return;
      try{
        setSubmitting(true);
        const offerToken = getContract<CoinBridgeToken>(
          formValues.offerTokenAddress,
          coinBridgeTokenABI,
          provider,
          account
        );

        const offerTokenDecimals = await offerToken?.decimals();

        if (!offerToken) {
          console.log('offerToken not found');
          return;
        }

        const amountInWei = new BigNumber(formValues.amount.toString()).shiftedBy(Number(offerTokenDecimals));
        const oldAllowance = await offerToken.allowance(account,realTokenYamUpgradeable.address);
        const amountInWeiToPermit = amountInWei.plus(new BigNumber(oldAllowance.toString()));

        // TokenType = 3: ERC20 Without Permit, do Approve/CreateOffer
        const approveTx = await offerToken.approve(
          realTokenYamUpgradeable.address,
          amountInWeiToPermit.toString()
        );

        const notificationApprove = {
          key: approveTx.hash,
          href: `${activeChain?.blockExplorerUrl}tx/${approveTx.hash}`,
          hash: approveTx.hash,
        };

        showNotification(
          NOTIFICATIONS[NotificationsID.approveOfferLoading](
            notificationApprove
          )
        );

        approveTx
          .wait()
          .then(({ status }) =>
            updateNotification(
              NOTIFICATIONS[
                status === 1
                  ? NotificationsID.approveOfferSuccess
                  : NotificationsID.approveOfferError
              ](notificationApprove)
            )
          );

        await approveTx.wait(1);

        resolve();

      }catch(err){
        reject(err)
      }
    });
  }

  // const onHandleSubmit = useCallback(
  //   async (formValues: SellFormValues) => {
  //     try {
  //       if (
  //         !account ||
  //         !provider ||
  //         !realTokenYamUpgradeable ||
  //         !formValues.offerTokenAddress ||
  //         !formValues.buyerTokenAddress ||
  //         !formValues.price ||
  //         !formValues.amount
  //       ) {
  //         return;
  //       }

  //       if (!provider || !account) {
  //         return;
  //       }

  //       setSubmitting(true);
  //       const offerToken = getContract<CoinBridgeToken>(
  //         formValues.offerTokenAddress,
  //         coinBridgeTokenABI,
  //         provider,
  //         account
  //       );
  //       const buyerToken = getContract<Erc20>(
  //         formValues.buyerTokenAddress,
  //         Erc20ABI,
  //         provider,
  //         account
  //       );

  //       if (!offerToken || !buyerToken) {
  //         console.log('offerToken or buyerToken not found');
  //         return;
  //       }
  //       const offerTokenDecimals = await offerToken.decimals();
  //       const buyerTokenDecimals = await buyerToken.decimals();

  //       const amountInWei = new BigNumber(
  //         formValues.amount.toString()
  //       ).shiftedBy(Number(offerTokenDecimals));
  //       const oldAllowance = await offerToken.allowance(
  //         account,
  //         realTokenYamUpgradeable.address
  //       );
  //       const amountInWeiToPermit = amountInWei.plus(
  //         new BigNumber(oldAllowance.toString())
  //       );

  //       const priceInWei = new BigNumber(formValues.price.toString()).shiftedBy(
  //         Number(buyerTokenDecimals)
  //       );

  //       const transactionDeadline = Math.floor(Date.now() / 1000) + 3600; // permit valable during 1h

  //       const offerTokenType = await realTokenYamUpgradeable.getTokenType(
  //         formValues.offerTokenAddress
  //       );

  //       if (offerTokenType === 1) {
  //         // TokenType = 1: RealToken
  //         const { r, s, v }: any = await coinBridgeTokenPermitSignature(
  //           account,
  //           realTokenYamUpgradeable.address,
  //           amountInWeiToPermit.toString(),
  //           transactionDeadline,
  //           offerToken,
  //           provider
  //         );

  //         const createOfferWithPermitTx =
  //           await realTokenYamUpgradeable.createOfferWithPermit(
  //             formValues.offerTokenAddress,
  //             formValues.buyerTokenAddress,
  //             formValues.isPrivateOffer === false
  //               ? ZERO_ADDRESS
  //               : formValues.buyerAddress,
  //             priceInWei.toString(),
  //             amountInWei.toString(),
  //             amountInWeiToPermit.toString(10),
  //             transactionDeadline.toString(),
  //             v,
  //             r,
  //             s
  //           );
  //         const notificationPayload = {
  //           key: createOfferWithPermitTx.hash,
  //           href: `${activeChain?.blockExplorerUrl}tx/${createOfferWithPermitTx.hash}`,
  //           hash: createOfferWithPermitTx.hash,
  //         };

  //         showNotification(
  //           NOTIFICATIONS[NotificationsID.createOfferLoading](
  //             notificationPayload
  //           )
  //         );

  //         createOfferWithPermitTx
  //           .wait()
  //           .then(({ status }) =>
  //             updateNotification(
  //               NOTIFICATIONS[
  //                 status === 1
  //                   ? NotificationsID.createOfferSuccess
  //                   : NotificationsID.createOfferError
  //               ](notificationPayload)
  //             )
  //           );
  //       } else if (offerTokenType === 2) {
  //         // TokenType = 2: ERC20 With Permit
  //         const { r, s, v }: any = await erc20PermitSignature(
  //           account,
  //           realTokenYamUpgradeable.address,
  //           amountInWeiToPermit.toString(),
  //           transactionDeadline,
  //           offerToken,
  //           provider
  //         );

  //         const createOfferWithPermitTx =
  //           await realTokenYamUpgradeable.createOfferWithPermit(
  //             formValues.offerTokenAddress,
  //             formValues.buyerTokenAddress,
  //             formValues.isPrivateOffer === false
  //               ? ZERO_ADDRESS
  //               : formValues.buyerAddress,
  //             priceInWei.toString(),
  //             amountInWei.toString(),
  //             amountInWeiToPermit.toString(10),
  //             transactionDeadline.toString(),
  //             v,
  //             r,
  //             s
  //           );
  //         const notificationPayload = {
  //           key: createOfferWithPermitTx.hash,
  //           href: `${activeChain?.blockExplorerUrl}tx/${createOfferWithPermitTx.hash}`,
  //           hash: createOfferWithPermitTx.hash,
  //         };

  //         showNotification(
  //           NOTIFICATIONS[NotificationsID.createOfferLoading](
  //             notificationPayload
  //           )
  //         );

  //         createOfferWithPermitTx
  //           .wait()
  //           .then(({ status }) =>
  //             updateNotification(
  //               NOTIFICATIONS[
  //                 status === 1
  //                   ? NotificationsID.createOfferSuccess
  //                   : NotificationsID.createOfferError
  //               ](notificationPayload)
  //             )
  //           );
  //       } else if (offerTokenType === 3) {
  //         // TokenType = 3: ERC20 Without Permit, do Approve/CreateOffer
  //         const approveTx = await offerToken.approve(
  //           realTokenYamUpgradeable.address,
  //           amountInWeiToPermit.toString()
  //         );

  //         const notificationApprove = {
  //           key: approveTx.hash,
  //           href: `${activeChain?.blockExplorerUrl}tx/${approveTx.hash}`,
  //           hash: approveTx.hash,
  //         };

  //         showNotification(
  //           NOTIFICATIONS[NotificationsID.approveOfferLoading](
  //             notificationApprove
  //           )
  //         );

  //         approveTx
  //           .wait()
  //           .then(({ status }) =>
  //             updateNotification(
  //               NOTIFICATIONS[
  //                 status === 1
  //                   ? NotificationsID.approveOfferSuccess
  //                   : NotificationsID.approveOfferError
  //               ](notificationApprove)
  //             )
  //           );

  //         await approveTx.wait(1);

  //         const createOfferTx = await realTokenYamUpgradeable.createOffer(
  //           formValues.offerTokenAddress,
  //           formValues.buyerTokenAddress,
  //           formValues.isPrivateOffer === false
  //             ? ZERO_ADDRESS
  //             : formValues.buyerAddress,
  //           priceInWei.toString(),
  //           amountInWei.toString()
  //         );

  //         const notificationCreateOffer = {
  //           key: createOfferTx.hash,
  //           href: `${activeChain?.blockExplorerUrl}tx/${createOfferTx.hash}`,
  //           hash: createOfferTx.hash,
  //         };

  //         showNotification(
  //           NOTIFICATIONS[NotificationsID.createOfferLoading](
  //             notificationCreateOffer
  //           )
  //         );

  //         createOfferTx
  //           .wait()
  //           .then(({ status }) =>
  //             updateNotification(
  //               NOTIFICATIONS[
  //                 status === 1
  //                   ? NotificationsID.createOfferSuccess
  //                   : NotificationsID.createOfferError
  //               ](notificationCreateOffer)
  //             )
  //           );
  //       } else {
  //         console.log('Token is not whitelisted');
  //         showNotification(NOTIFICATIONS[NotificationsID.createOfferInvalid]());
  //       }
  //     } catch (error) {
  //       console.log('ERROR WHEN SELLING WITH PERMIT', error);
  //       showNotification(NOTIFICATIONS[NotificationsID.createOfferInvalid]());
  //     } finally {
  //       setSubmitting(false);
  //     }
  //   },
  //   [account, provider, realTokenYamUpgradeable, activeChain?.blockExplorerUrl]
  // );

  const privateOffer = () => {
    if (getInputProps('isPrivateOffer', { type: 'checkbox' }).checked) {
      return(
        <TextInput
          label={t('labelPrivateBuyerAddress')}
          placeholder={t('placeholderOfferPrivatBuyerAddress')}
          required={values.isPrivateOffer}
          disabled={!values.isPrivateOffer}
          error={"Impossible de créér une offre à destination de votre address"}
          {...getInputProps('buyerAddress')}
        />
      )
    } else {
      return
    }
  }

  const { allowedTokens, properties, buyerTokens, offerTokens } 
    = useCreateOfferTokens(offer.offerType, values.offerTokenAddress, values.buyerTokenAddress);

  const exchangeOfferTokens = exchangeType == realT ? 
      properties.filter(property => property.value != values.buyerTokenAddress)
    : 
      allowedTokens.filter(allowedToken => allowedToken.value != values.buyerTokenAddress);

  const exchangeBuyerToken = exchangeType == realT ? 
      properties.filter(property => property.value != values.offerTokenAddress)
    : 
      allowedTokens.filter(allowedToken => allowedToken.value != values.offerTokenAddress)

  const offerTokenSymbol = offerTokens.find(value => value.value == values.offerTokenAddress)?.label;
  const buyTokenSymbol =  buyerTokens.find(value => value.value == values.buyerTokenAddress)?.label;
  const total = (values.amount ?? 0) * (values.price ?? 0);

  const { getPropertyToken } = usePropertiesToken(false);
  const officialPrice = getPropertyToken ? getPropertyToken(values.offerTokenAddress)?.officialPrice : undefined;
  const officialSellCurrency = getPropertyToken ? getPropertyToken(values.offerTokenAddress)?.currency : undefined;

  const { isError: shieldError, maxPriceDifference, priceDifference } = useShield(values.price,officialPrice);

  const { bigNumberbalance } = useWalletERC20Balance(values.offerTokenAddress);

  const approveAndsaveCreatedOffer = async (formValues: SellFormValues) => {
    try{

      await approve(formValues);

      const createdOffer: CreatedOffer = {
        offerType: offer.offerType,
        offerId: offers.length,
        offerTokenAddress: formValues.offerTokenAddress,
        buyerTokenAddress: formValues.buyerTokenAddress,
        price: formValues.price ?? 0,
        amount: formValues.amount,
        buyerAddress: formValues.buyerAddress,
        isPrivateOffer: formValues.isPrivateOffer
      }

      dispatch({ type: createOfferAddedDispatchType, payload: createdOffer });

      context.closeModal(id)

    }catch(err){
      console.log(err)
    }
  }

  const summary = () => {
    if(total && buyTokenSymbol && offerTokenSymbol){
      return (
        <Text size={"md"} mb={10}>
            {/* {` ${t("summaryText1")} ${values?.amount} "${offerTokenSymbol}" ${t("summaryText2")} ${cleanNumber(values.price ?? 0)} ${buyTokenSymbol} ${t("summaryText3")} ${total} ${buyTokenSymbol}`} */}
            {` Vous achetez jusqu'a ${values?.amount} "${buyTokenSymbol}" ${t("summaryText2")} ${cleanNumber(values.price ?? 0)} "${offerTokenSymbol}" ${t("summaryText3")} ${total} "${offerTokenSymbol}"`}
        </Text>
      )
    }else{
      return undefined;
    }
  }

  const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
    ({ label, value, ...others }: ItemProps, ref) => (
      <Flex ref={ref} {...others} key={label} gap={"sx"} direction={"column"}>
          <Text fz={"sm"} fw={700}>{label}</Text>
          <Text fz={"xs"} fs={"italic"}>{value}</Text>
      </Flex>
    )
  );

  // COMPONENTS
  const getSelect = (offerTokenSelectData: SelectItem[], buyerTokenSelectData: SelectItem[]) => {

    const selects = [
      <Select
        key={"select-0"}
        label={t('offerTokenAddress')}
        placeholder={t('placeholderOfferSellTokenAddress')}
        searchable={true}
        required={true}
        style={{ width : "100%" }}
        nothingFound={"No property found"}
        itemComponent={SelectItem}
        data={offerTokenSelectData}
        {...getInputProps('offerTokenAddress')}
      />,
      <Select
        key={"select-1"}
        label={t('buyerTokenAddress')}
        placeholder={t('placeholderOfferBuyTokenAddress')}
        searchable={true}
        style={{ width : "100%" }}
        nothingFound={"No property found"}
        itemComponent={SelectItem}
        data={buyerTokenSelectData}
        required={true}
        {...getInputProps('buyerTokenAddress')}
      />
    ]

    return(
      <>
        { offer.offerType == OFFER_TYPE.BUY ?
            <>
              {selects[1]}
              {selects[0]}
            </>
            :
            <>
            {selects[0]}
            {selects[1]}
          </>
        }
      </>
    )
  }
  const PriceNumberInput = ({ label, width }:{ label?: string, width?: string }) => {
    return(
      <>
      <NumberInput
        label={label ? label : t('price')}
        placeholder={t('placeholderPrice')}
        required={true}
        disabled={false}
        min={0.000001}
        width={width ? width : "100%"}
        max={undefined}
        step={undefined}
        showMax={false}
        sx={{ flexGrow: 1 }}
        {...getInputProps('price')}
        error={shieldError && priceDifference ? t("shieldError", { priceDifference: (priceDifference*100).toFixed(2), maxPriceDifference: maxPriceDifference*100 }) : undefined}
      />
      <Text fz={"sm"} fs={"italic"}>
        { officialPrice && officialSellCurrency ? t("officialPriceInfos", { officialPrice, officialSellCurrency }) : undefined }
      </Text>
      </>
    )
  }

  // EXCHANGE
  const GetExchange = () => {

    useEffect(() => { setExchangeType(data[0].value) },[]);

    const setE = (value: string) => {
      setFieldValue("offerTokenAddress","");
      setFieldValue("buyerTokenAddress","");

      setExchangeType(value);
    }

    return(
      <>
        <Select 
          label={t("chooseExchangeTokenType")}
          data={data}
          value={exchangeType}
          onChange={setE}
        />
        <Flex gap={"md"}>
          {getSelect(
            exchangeOfferTokens,
            exchangeBuyerToken
          )}
        </Flex>
      </>
    )
  }
  const GetExchangePriceNumberInputs = () => {

    const [price,setPrice] = useState<number>(1);

    const exchangeOfferTokenSymbol = exchangeOfferTokens.find(value => value.value == values.offerTokenAddress)?.label;
    const exchangeBuyerTokenSymbol = exchangeBuyerToken.find(value => value.value == values.buyerTokenAddress)?.label;

    // const { getPropertyToken } = usePropertiesToken(false);

    // const exchangeOfferTokenPrice = values.offerTokenAddress ? getPropertyToken(values.offerTokenAddress)?.officialPrice : undefined;
    // const exchangeBuyerTokenPrice = values.buyerTokenAddress ? getPropertyToken(values.buyerTokenAddress)?.officialPrice : undefined;

    useEffect(() => {
      if(price) setFieldValue("price",parseFloat((1/price).toFixed(6)))
    },[price]);

    return(
      <Flex direction={"column"}>
        <Text fw={700} fz={"md"}>{t("priceComputingTitle")}</Text>
        { exchangeOfferTokenSymbol && exchangeBuyerTokenSymbol ?
          (<>
            <Text mb={"md"}>{t("priceComputing", { exchangeBuyerTokenSymbol, exchangeOfferTokenSymbol })}</Text>
            <Flex gap={"md"}>
              <Flex gap={9} direction={"column"} style={{ width: "100%" }}>
                <MantineInput
                  hideControls={true}
                  label={exchangeOfferTokenSymbol}
                  precision={6}
                  value={1}
                  disabled={true}
                  style={{ width: "100%" }}
                />
                {/* { exchangeOfferTokenPrice ? 
                  <Text fz={"sm"} fs={"italic"}>{`With official unit price of $${exchangeOfferTokenPrice?.toString()}`}</Text> 
                  : 
                  undefined 
                } */}
              </Flex>
              <IconArrowRight style={{ marginTop: "22px" }} size={46}/>
              <Flex gap={9} direction={"column"} style={{ width: "100%" }}>
                <MantineInput
                  hideControls={true}
                  label={exchangeBuyerTokenSymbol}
                  precision={6}
                  value={price ?? 0}
                  style={{ width: "100%" }}
                  onChange={(price) => setPrice(price ?? 0)}
                />
                {/* { exchangeBuyerTokenPrice ? 
                  <Text fz={"sm"} fs={"italic"}>{`With official unit price of $${exchangeBuyerTokenPrice?.toString()}`}</Text> 
                  : 
                  undefined 
                } */}
              </Flex>
            </Flex>
            <Text>{`1 "${exchangeBuyerTokenSymbol}" = ${(1/price).toFixed(3)} "${exchangeOfferTokenSymbol}"`}</Text>
            </>
            )
            :
            <Skeleton width={"100%"} height={100} mt={5}/>
          }
      </Flex>
    )
  }

  // BUY
  const GetBuyPriceNumberInputs = () => {

    const buyerTokenSymbol = offerTokens.find(token => token.value == values.offerTokenAddress)?.label;
    const { price } = useOraclePriceFeed(values.offerTokenAddress);

    const [value,setValue] = useState<string|undefined>("0");

    useEffect(() => {
      if(!values.price || !price) return;
      setValue(new BigNumber(1).dividedBy(new BigNumber(values.price).dividedBy(price)).toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[values,price])

    return(
      <Flex direction={"column"} gap={9}>
        <Flex gap={10} align={"center"}>
          {PriceNumberInput({ label: t("priceInCurrency", { currency: "$" }), width: "100%" })}
          <IconArrowsSort style={{ marginTop: "22px", rotate: "90deg" }} size={46}/>
          <MantineInput
            hideControls={true}
            label={buyTokenSymbol ? `${t("price")} "${buyTokenSymbol}"` : `${t("price")}`}
            disabled={true}
            precision={6}
            value={parseFloat(value ?? "0")}
            style={{ width: "100%" }}
          />
        </Flex>
        { buyerTokenSymbol && price ? <Text>{t("withPrice", { buyerTokenSymbol: buyerTokenSymbol, price: price.toString(), currency: "$" })}</Text> : undefined }
      </Flex>
    )
  }

  return (
    <Flex direction={"column"} mx={'auto'} gap={"md"} style={{ width: calcRem(500) }}>
      <Flex style={{ justifyContent: "space-between", alignItems: "center", height: "50px" }}>
        <Flex gap={"sm"} align={"center"}>
          <OfferTypeBadge offerType={offer.offerType} />
          <h3 style={{ margin: 0 }}>{t('titleFormCreateOffer')}</h3>
        </Flex>
        <Shield />        
      </Flex>
      <form onSubmit={onSubmit(approveAndsaveCreatedOffer)}>
        <Stack justify={'center'} align={'stretch'}>

        { offer.offerType == OFFER_TYPE.EXCHANGE ? 
            GetExchange() 
          : 
            getSelect(offerTokens,buyerTokens) 
        }

        { offer.offerType == OFFER_TYPE.BUY ?
            GetBuyPriceNumberInputs()
          : offer.offerType == OFFER_TYPE.EXCHANGE ?
            GetExchangePriceNumberInputs()
          :
            PriceNumberInput({})
        }
        
        <NumberInput
          label={offer.offerType == OFFER_TYPE.EXCHANGE ? t('exchangeAmount') : t('amount')}
          placeholder={t('placeholderAmount')}
          required={true}
          min={0.000001}
          max={undefined}
          step={undefined}
          showMax={false}
          sx={{ flexGrow: 1 }}
          {...getInputProps('amount')}
        />
        
        <Checkbox
          mt={'md'}
          label={t('checkboxLabelPrivateOffre')}
          {...getInputProps('isPrivateOffer', { type: 'checkbox' })}
        />

        {privateOffer()}

        <Group position={'left'} mt={'md'}>
          <>
            {summary()}
            {  values.offerTokenAddress && bigNumberbalance && bigNumberbalance.eq(0) ? 
                <Text color={"red"} fz={"sm"}>{t("zeroBalanceError", { tokenSymbol: offerTokenSymbol })}</Text> 
              : 
                undefined 
            }
            <Button
              type={'submit'}
              aria-label={'submit'}
              loading={(bigNumberbalance && bigNumberbalance == undefined) || isSubmitting}
              disabled={!isValid || bigNumberbalance?.eq(0) || shieldError}
            >
              {"Approve offer"}
            </Button>
          </>
        </Group>
        </Stack>
      </form>
    </Flex>
  );
};
