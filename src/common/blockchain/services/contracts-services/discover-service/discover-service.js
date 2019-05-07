/* global web3 */
import { broadcastContractFn } from '../helpers'

import * as ipfsSDK from '../../../ipfs'
import BlockchainService from '../blockchain-service'

import DiscoverValidator from './discover-validator'
import DiscoverContract from '../../../../../embarkArtifacts/contracts/Discover'

class DiscoverService extends BlockchainService {
  constructor(sharedContext) {
    super(sharedContext, DiscoverContract, DiscoverValidator)
  }

  // View methods
  async upVoteEffect(id, amount) {
    await this.validator.validateUpVoteEffect(id, amount)

    return DiscoverContract.methods.upvoteEffect(id, amount).call()
  }

  async downVoteCost(id) {
    const dapp = await this.getDAppById(id)
    return DiscoverContract.methods.downvoteCost(dapp.id).call()
  }

  // Todo: Should be implemented
  // async getDApps() {
  //   const dapps = []
  //   const dappsCount = await DiscoverContract.methods.getDAppsCount().call()

  //   for (let i = 0; i < dappsCount; i++) {
  //     const dapp = await DiscoverContract.methods.dapps(i).call()
  //   }
  // }

  async getDAppById(id) {
    let dapp
    try {
      const dappId = await DiscoverContract.methods.id2index(id).call()
      dapp = await DiscoverContract.methods.dapps(dappId).call()
    } catch (error) {
      throw new Error('Searching DApp does not exists')
    }

    if (dapp.id != id) {
      throw new Error('Error fetching correct data from contract')
    }

    return dapp
  }

  async getDAppDataById(id) {
    const dapp = await this.getDAppById(id)

    try {
      dapp.metadata = JSON.parse(await ipfsSDK.retrieveMetadata(dapp.metadata))
      dapp.metadata.image = await ipfsSDK.retrieveImageUrl(dapp.metadata.image)

      return dapp
    } catch (error) {
      throw new Error('Error fetching correct data from IPFS')
    }
  }

  async safeMax() {
    return DiscoverContract.methods.safeMax().call()
  }

  async isDAppExists(id) {
    return DiscoverContract.methods.existingIDs(id).call()
  }

  // Transaction methods
  async createDApp(amount, metadata) {
    const dappMetadata = JSON.parse(JSON.stringify(metadata))
    const dappId = web3.utils.keccak256(JSON.stringify(dappMetadata))

    await this.validator.validateDAppCreation(dappId, amount)

    dappMetadata.image = await ipfsSDK.uploadImage(dappMetadata.image)
    const uploadedMetadata = await ipfsSDK.uploadMetadata(
      JSON.stringify(dappMetadata),
    )

    const callData = DiscoverContract.methods
      .createDApp(dappId, amount, uploadedMetadata)
      .encodeABI()

    const createdTx = await this.sharedContext.SNTService.approveAndCall(
      this.contract,
      amount,
      callData,
    )

    return { tx: createdTx, id: dappId }
  }

  async upVote(id, amount) {
    await this.validator.validateUpVoting(id, amount)

    const callData = DiscoverContract.methods.upvote(id, amount).encodeABI()
    return this.sharedContext.SNTService.approveAndCall(
      this.contract,
      amount,
      callData,
    )
  }

  async downVote(id, amount) {
    await this.validator.validateDownVoting(id, amount)

    const callData = DiscoverContract.methods.downvote(id, amount).encodeABI()
    return this.sharedContext.SNTService.approveAndCall(
      this.contract,
      amount,
      callData,
    )
  }

  async withdraw(id, amount) {
    await super.__unlockServiceAccount()
    await this.validator.validateWithdrawing(id, amount)

    try {
      return broadcastContractFn(
        DiscoverContract.methods.withdraw(id, amount).send,
        this.sharedContext.account,
      )
    } catch (error) {
      throw new Error(`Transfer on withdraw failed. Details: ${error.message}`)
    }
  }

  // Todo: Should we upload the metadata to IPFS
  async setMetadata(id, metadata) {
    await super.__unlockServiceAccount()
    await this.validator.validateMetadataSet(id)

    try {
      return broadcastContractFn(
        DiscoverContract.methods.setMetadata(id, metadata).send,
        this.sharedContext.account,
      )
    } catch (error) {
      throw new Error(`Uploading metadata failed. Details: ${error.message}`)
    }
  }
}

export default DiscoverService
