import { gmSignal } from './gm-signal'

// Meme Contributor (社区烂梗贡献者)
export const enableMemeContribution = gmSignal('enableMemeContribution', false)
export const memeContributorCandidates = gmSignal<string[]>('memeContributorCandidates', [])
export const memeContributorSeenTexts = gmSignal<string[]>('memeContributorSeenTexts', [])
