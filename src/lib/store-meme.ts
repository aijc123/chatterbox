import { gmSignal } from './gm-signal'

// Meme Contributor (社区烂梗贡献者)
export const enableMemeContribution = gmSignal('enableMemeContribution', false)

// roomId(String) → 候选梗列表
export const memeContributorCandidatesByRoom = gmSignal<Record<string, string[]>>('memeContributorCandidatesByRoom', {})

// roomId(String) → 已见(被忽略或已贡献)梗列表
export const memeContributorSeenTextsByRoom = gmSignal<Record<string, string[]>>('memeContributorSeenTextsByRoom', {})
