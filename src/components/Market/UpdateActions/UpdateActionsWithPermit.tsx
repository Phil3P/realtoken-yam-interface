import { Dispatch, FC, SetStateAction, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionIcon, Group, Title } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { IconEdit } from '@tabler/icons';
import { useWeb3React } from '@web3-react/core';

import { Offer } from 'src/types/offer/Offer';

type UpdateActions = {
  updateOffer: Offer;
  triggerRefresh: Dispatch<SetStateAction<boolean>>;
};

export const UpdateActionsWithPermit: FC<UpdateActions> = ({
  updateOffer,
  triggerRefresh,
}) => {
  const { account } = useWeb3React();
  const modals = useModals();

  const { t } = useTranslation('modals');

  const onOpenUpdateModal = useCallback(
    (offer: Offer) => {
      modals.openContextModal('updatePermit', {
        title: <Title order={3}>{t('update.title')}</Title>,
        size: "lg",
        innerProps: {
          offer: offer,
          triggerTableRefresh: triggerRefresh,
        },
      });
    },
    [modals, triggerRefresh, t]
  );

  const onOpenWalletModal = useCallback(() => {
    modals.openContextModal('wallet', {
      title: <Title order={3}>{t('wallet.title')}</Title>,
      innerProps: {},
    });
  }, [modals, t]);

  return (
    <Group position={'center'}>
      {
        <ActionIcon
          color={'green'}
          onClick={() =>
            account ? onOpenUpdateModal(updateOffer) : onOpenWalletModal()
          }
        >
          <IconEdit size={16} />
        </ActionIcon>
      }
    </Group>
  );
};
