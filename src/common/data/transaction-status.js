import { getTransactionData } from '../../modules/TransactionStatus/TransactionStatus.utilities'

let transactionStatus
const transactionData = getTransactionData()

if (transactionData !== '') {
  transactionStatus = JSON.parse(transactionData)
  // if (transactionStatus.dappTransactionHash === '') {
  //   transactionStatus.dappName = ''
  //   transactionStatus.dappImg = ''
  // }
} else {
  transactionStatus = {
    dappTransactionHash: '',
    dappName: '',
    dappImg: '',
    progress: false,
    published: false,
    failed: false,
  }
}

export default transactionStatus
