import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import mediaContractABI from '../contract/mediaContractABI.json';

const contractAddress = process.env.REACT_APP_MEDIA_CONTRACT as string;

const useMediaContract = () => {
  const web3 = new Web3(Web3.givenProvider);

  const mediaContract = new web3.eth.Contract(
    mediaContractABI as unknown as AbiItem,
    contractAddress
  );
  return { web3, mediaContract };
};

export default useMediaContract;
