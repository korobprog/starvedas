"use server";

import {
  bulkProcessParticipantListsAction as runBulkProcessParticipantListsAction,
  bulkProcessParticipantsAction as runBulkProcessParticipantsAction,
  claimParticipantListByCuratorAction as runClaimParticipantListByCuratorAction,
  claimCuratorServiceParticipantListsAction as runClaimCuratorServiceParticipantListsAction,
  type ParticipantListClaimState,
  type ParticipantBulkProcessState
} from "@/server/participant-lists";

export async function bulkProcessParticipantsAction(
  state: ParticipantBulkProcessState,
  formData: FormData
) {
  return runBulkProcessParticipantsAction(state, formData);
}

export async function bulkProcessParticipantListsAction(
  state: ParticipantBulkProcessState,
  formData: FormData
) {
  return runBulkProcessParticipantListsAction(state, formData);
}

export async function claimParticipantListByCuratorAction(
  state: ParticipantListClaimState,
  formData: FormData
) {
  return runClaimParticipantListByCuratorAction(state, formData);
}

export async function claimCuratorServiceParticipantListsAction(
  state: ParticipantListClaimState,
  formData: FormData
) {
  return runClaimCuratorServiceParticipantListsAction(state, formData);
}
