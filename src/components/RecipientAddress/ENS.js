import {ethers} from 'ethers'
const provider = ethers.getDefaultProvider()

export const isValidENSName = name => !!name.match(/ˆ*\.eth$/)
export const getAddressFromENSName = name => provider.resolveName(name)