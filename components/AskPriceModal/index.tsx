import React, { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from 'components/Modal'
import useToast from 'hooks/useToast'
import { Flex, Text, Select, Input, Link, StyledButton } from 'toolkitUI'
import { getTokenAddress } from 'utils/addressHelpers'
import parseAndWei from 'utils/parseAndWei'
import { scanLinks } from 'constants/index'
import { mediaContract } from 'hooks/useMediaContract'

interface Props {
  mediaId: string
  name: string
  onDismiss: () => void
  owner: string
  updateAskPrice: (asking: number) => void
  account?: string
  chainID: string
}

const AskPriceModal: FC<Props> = ({ onDismiss, owner, mediaId, name, updateAskPrice, chainId }) => {
  const toast = useToast()
  const { t } = useTranslation()

  const [asking, setAsking] = useState(null)
  const [currency, setCurrency] = useState('xxx')
  const [errorMsg, setErrorMsg] = useState(null)
  const [updatedMsg, setUpdatedMsg] = useState(null)
  const [processing, setProcessing] = useState(false)

  const base = scanLinks[chainId] ? scanLinks[chainId] : `https://etherscan.io`
  const txLink = `${base}/tx/`

  const handleAskChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    if (
      (Number(value) >= 0.01 && Number(value) <= 999999999) ||
      value === '' ||
      value === '0' ||
      value === '0.' ||
      value === '0.0'
    ) {
      setAsking(event.target.value)
    }
  }

  const handleCurrencyChange = (event: React.FormEvent<HTMLSelectElement>) => {
    setCurrency(event.target.value)
  }

  const getAddress = async () => {
    let address = ''
    switch (currency) {
      case 'XXX':
        address = getTokenAddress(chainId)
        break
      case 'wETH':
        address =
          chainId === 4 ? '0xc...' : '0xC...'
        break
      case 'wBNB':
        address =
          chainId === 97 ? '0xa...' : '0xb...'
        break
    }
    return address
  }

  const setAskingPrice = async () => {
    const bigReserve = parseAndWei(String(asking ?? 0))
    const askCurrency = await getAddress()
    const askData = {
      amount: bigReserve,
      currency: askCurrency,
      sellOnShare: 0, // Set to 0 becuase this is no longer a feature
    }
    let txMsg = 'processing...'
    setUpdatedMsg(txMsg)
    setProcessing(true)

    await mediaContract.methods
      .setAsk(mediaId, askData)
      .send({ from: owner })
      .on('error', () => {
        setErrorMsg('Something went wrong. Please try again later.')
        setUpdatedMsg('canceled.')
      })
      .on('transactionHash', (transactionHash) => {
        txMsg = `${txLink}${transactionHash}`
        console.log(txMsg)
        setUpdatedMsg(txMsg)
      })
      .once('confirmation', () => {
        updateAskPrice(asking)
        toast.toastSuccess(`Successfully updated new asking price.`)
      })
      .then(() => {
        setErrorMsg(null)
      })
    setProcessing(false)
  }

  useEffect(() => {
    try {
      if (Number(asking) > 0 || asking === null) {
        setErrorMsg(null)
        return
      }
      setErrorMsg('Invalid amount')
    } catch {
      setErrorMsg('Bid not allowed at this time')
    }
  }, [errorMsg, asking, setErrorMsg])


  return (
    <Modal title={t(`Set Asking Price for ${name}`)} onDismiss={onDismiss}>
      <Text
        fontSize="20px"
        bold
        mb='8px'
      >
        {`New asking price: ${Number(asking) ?? ' '}`}
      </Text>

      <Flex>
        <Input
          disabled={processing}
          value={asking}
          onChange={handleAskChange}
          style={{ borderRadius: '25px' }}
        />
        <Select
          disabled={processing}
          value={currency}
          onChange={handleCurrencyChange}
        >
          <option value="XXX">XXX</option>
          <option value={chainId === 4 || chainId === 1 ? 'wETH' : 'wBNB'}>
            {chainId === 4 || chainId === 1 ? 'wETH' : 'wBNB'}
          </option>
        </Select>
      </Flex>

      <Text
        bold
        ml="8px"
        color={
          errorMsg !== null
            ? 'red'
            : 'transparent'
        }
      >
        {errorMsg ?? ''}
      </Text>

      {updatedMsg?.startsWith(base) ? (
        <Link external href={updatedMsg}>
          <Text
            bold
            ml="8px"
            color={
              updatedMsg !== null
                ? 'text'
                : 'transparent'
            }
            style={{ wordBreak: 'break-word' }}
          >
            {`View on ${base.split('//')[1].split('.')[0]}: ${updatedMsg.split('/tx/')[1]}`}
          </Text>
        </Link>
      ) : (
        <Text
          bold
          ml="8px"
          color={
            updatedMsg != null
              ? 'text' :
              'transparent'
          }
          style={{ wordBreak: 'break-word' }}
        >
          {updatedMsg ?? ''}
        </Text>
      )}

      <Flex alignItems="center" justifyContent="center" height="40px" mt="16px">
        <StyledButton
          disabled={errorMsg != null || asking === null || updatedMsg?.startsWith()}
          onClick={updatedMsg ? onDismiss : setAskingPrice}
          variant="secondary"
        >
          {updatedMsg ? 'Close' : 'Submit'}
        </StyledButton>
      </Flex>
    </Modal>
  )
}

export default AskPriceModal
