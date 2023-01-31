import Web3 from 'web3'
import { FC, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, Flex } from 'toolkitUI'
import type { InjectedProps } from 'toolkitUI'
import { getAuctionHouseAddress } from 'utils/addressHelpers'
import { getAuctionHouse } from 'utils/contractHelpers'
import parseAndWei from 'utils/parseAndWei'
import timeData from 'utils/timeData'
import { AbiItem } from 'web3-utils'
import QuestionHelper from 'components/QuestionHelper'
import { mediaContract } from 'hooks/useMediaContract'
import useToast from 'hooks/useToast'

export interface CreateAuctionProps extends InjectedProps {
  onDismiss?: () => void
  nft: any
  web3?: Web3
  chainId?: number
  account?: string
}

const CreateAuctionModal: FC<CreateAuctionProps> = ({ onDismiss, nft, web3, chainId, account }) => {
  const toast = useToast()
  const { t } = useTranslation()

  const [priceRef, setPrice] = useState(0)
  const [currencyRef, setCurrency] = useState('0x5........')
  const [resPError, setResPError] = useState(false)
  const [currError, setCurrError] = useState(false)
  const [duration, setDuration] = useState(30 * 60)
  const [approved, setApprove] = useState(false)
  const [processing, setProcessing] = useState(false)

  const onChange = (type: string) => (e) => {
    const newVal = e.target.value
    switch (type) {
      case 'duration':
        setDuration(newVal)
        break
      case 'price':
        setPrice(newVal)
        setResPError(false)
        break
      default:
        if (newVal.slice(0, 2) === '0x' && newVal.length === 42) {
          setCurrency(newVal)
          setCurrError(false)
          break
        } else {
          setCurrError(true)
          break
        }
    }
  }

  const handleCreateAuction = async (localNft) => {
    setProcessing(true)
    try {
      const auctionHouse = getAuctionHouse(web3, chainId)
      const bigReserve = parseAndWei(String(priceRef))
      const eGas = await auctionHouse.methods
        .createAuction(
          localNft.tokenId,
          localNft.contractAddress,
          duration,
          bigReserve,
          '0x0000000000000000000000000000000000000000',
          0,
          currencyRef,
        )
        .estimateGas({ from: account })
      await auctionHouse.methods
        .createAuction(
          localNft.tokenId,
          localNft.contractAddress,
          duration,
          bigReserve,
          '0x0000000000000000000000000000000000000000',
          0,
          currencyRef,
        )
        .send({ from: account, gas: eGas })
      onDismiss()
      toast.toastSuccess('The auction has been created')
    } catch (error) {
      toast.toastError('Failed to create the auction')
    } finally {
      setProcessing(false)
    }
  }

  const checkApprove = async () => {
    if (nft && chainId) {
      const auctionAddress = getAuctionHouseAddress(chainId)
      const approvedAccount = await mediaContract.methods.getApproved(nft.tokenId).call()
      if (approvedAccount.toLowerCase() === auctionAddress.toLowerCase()) {
        setApprove(true)
      }
    }
  }

  const handleApprove = async () => {
    const auctionAddress = getAuctionHouseAddress(chainId)
    setProcessing(true)

    try {
      await mediaContract.methods.approve(auctionAddress, nft.tokenId).send({ from: account })
      setApprove(true)
      toast.toastSuccess('The auction has been approved')
    } catch (err) {
      console.error('Auction Approve', err)
      toast.toastError('Failed to approve')
    } finally {
      setProcessing(false)
    }
  }

  useEffect(() => {
    checkApprove()
  }, [nft, chainId])

  return (
    <Modal title={`Auction ${nft.title}`} onDismiss={onDismiss}>
      <SubTitleWrapperWrapper>
        <SubHeading1 as="h3">
          {t('Duration')}
        </SubHeading1>
      </SubTitleWrapperWrapper>

      <CurrencySelect
        disabled={processing}
        value={duration}
        onChange={() => onChange('duration')}
      >
        {timeData.map((entry) => {
          return <option value={entry.value}> {entry.label} </option>
        })}
      </CurrencySelect>

      <SubTitleWrapperWrapper>
        <SubHeading1 as="h3">
          {t('Reserve Price')}
        </SubHeading1>
        <QuestionHelper
          text="The minimum price the bidding must reach for the auction to close. If bidding does not reach this price, the NFT will be returned to you."
        />
      </SubTitleWrapperWrapper>

      <Flex>
        <Input
          type="number"
          step={1}
          error={resPError}
          onChange={() => onChange('price')}
        />
        <CurrencySelect
          disabled={processing}
          value={currencyRef}
          onChange={() => onChange('currency')}
        >
          <option value='0x5....'>
            XXX
          </option>
          <option value='0xc....'>
            {chainId === 4 || chainId === 1 ? 'wETH' : 'wBNB'}
          </option>
        </CurrencySelect>
      </Flex>
      <ButtonsWrapper>
        <CreateBtn mt="20px" mr="30px" onClick={() => onDismiss()}>
          {t('Cancel')}
        </CreateBtn>
        {approved ? (
          <CreateBtn
            mt="20px"
            mr="30px"
            onClick={() => handleCreateAuction(nft)}
            disabled={
              currError ||
              resPError ||
              duration === 0 ||
              currencyRef.length === 0 ||
              String(priceRef).length === 0 ||
              processing
            }
          >
            {t('Create Auction')}
          </CreateBtn>
        ) : (
          <CreateBtn
            mt="20px"
            mr="30px"
            onClick={() => handleApprove()}
            disabled={
              currError || resPError || duration === 0 || currencyRef.length === 0 || priceRef <= 0 || processing
            }
          >
            {t('Approve Auction')}
          </CreateBtn>
        )}
      </ButtonsWrapper>
    </Modal>
  )
}

export default CreateAuctionModal
