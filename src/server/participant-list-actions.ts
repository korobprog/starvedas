"use server";

import {
  bulkProcessParticipantsAction as runBulkProcessParticipantsAction,
  claimParticipantListByCuratorAction as runClaimParticipantListByCuratorAction,
  type ParticipantListClaimState,
  type ParticipantBulkProcessState
} from "@/server/participant-lists";

export async function bulkProcessParticipantsAction(
  state: ParticipantBulkProcessState,
  formData: FormData
) {
  return runBulkProcessParticipantsAction(state, formData);
}

export async function claimParticipantListByCuratorAction(
  state: ParticipantListClaimState,
  formData: FormData
) {
  return runClaimParticipantListByCuratorAction(state, formData);
}
