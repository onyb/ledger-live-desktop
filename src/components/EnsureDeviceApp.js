// @flow

import React, { Component } from 'react'
import invariant from 'invariant'
import { connect } from 'react-redux'
import { Trans } from 'react-i18next'
import type { Account, CryptoCurrency } from '@ledgerhq/live-common/lib/types'
import { getCryptoCurrencyIcon } from '@ledgerhq/live-common/lib/react'

import logger from 'logger'
import getAddress from 'commands/getAddress'
import { createCancelablePolling } from 'helpers/promise'
import {
  isSegwitDerivationMode,
  getDerivationScheme,
  runDerivationScheme,
} from '@ledgerhq/live-common/lib/derivation'

import DeviceInteraction from 'components/DeviceInteraction'
import Text from 'components/base/Text'

import IconUsb from 'icons/Usb'

import type { Device } from 'types/common'

import { WrongDeviceForAccount } from '@ledgerhq/errors'
import { getCurrentDevice } from 'reducers/devices'

const usbIcon = <IconUsb size={16} />
const Bold = props => <Text ff="Open Sans|SemiBold" {...props} />

const mapStateToProps = state => ({
  device: getCurrentDevice(state),
})

class EnsureDeviceApp extends Component<{
  device: ?Device,
  account?: ?Account,
  currency?: ?CryptoCurrency,
}> {
  connectInteractionHandler = () =>
    createCancelablePolling(() => {
      if (!this.props.device) return Promise.reject()
      return Promise.resolve(this.props.device)
    })

  openAppInteractionHandler = ({ device }) =>
    createCancelablePolling(async () => {
      const { account, currency: _currency } = this.props
      const currency = account ? account.currency : _currency
      invariant(currency, 'No currency given')
      const address = await getAddressFromAccountOrCurrency(device, account, currency)
      if (account) {
        const { freshAddress } = account
        if (account && freshAddress !== address) {
          logger.warn({ freshAddress, address })
          throw new WrongDeviceForAccount(`WrongDeviceForAccount ${account.name}`, {
            accountName: account.name,
          })
        }
      }
      return address
    })

  renderOpenAppTitle = () => {
    const { account, currency } = this.props
    const cur = account ? account.currency : currency
    invariant(cur, 'No currency given')
    return (
      <Trans i18nKey="deviceConnect.step2" parent="div">
        {'Open the '}
        <Bold>{cur.managerAppName}</Bold>
        {' app on your device'}
      </Trans>
    )
  }

  render() {
    const { account, currency, device, ...props } = this.props
    const cur = account ? account.currency : currency
    const Icon = cur ? getCryptoCurrencyIcon(cur) : null
    return (
      <DeviceInteraction
        key={device ? device.path : null}
        shouldRenderRetry
        steps={[
          {
            id: 'device',
            title: (
              <Trans i18nKey="deviceConnect.step1" parent="div">
                {'Connect your'}
                <Bold>{'Ledger device'}</Bold>
                {'to your computer and enter your'}
                <Bold>{'PIN code'}</Bold>
                {'  on your device'}
              </Trans>
            ),
            icon: usbIcon,
            run: this.connectInteractionHandler,
          },
          {
            id: 'address',
            title: this.renderOpenAppTitle,
            icon: Icon ? <Icon size={16} /> : null,
            run: this.openAppInteractionHandler,
          },
        ]}
        {...props}
      />
    )
  }
}

async function getAddressFromAccountOrCurrency(device, account, currency) {
  const { address } = await getAddress
    .send({
      derivationMode: account ? account.derivationMode : '',
      devicePath: device.path,
      currencyId: currency.id,
      path: account
        ? account.freshAddressPath
        : runDerivationScheme(getDerivationScheme({ currency, derivationMode: '' }), currency),
      segwit: account ? isSegwitDerivationMode(account.derivationMode) : false,
    })
    .toPromise()
  return address
}

export default connect(mapStateToProps)(EnsureDeviceApp)
