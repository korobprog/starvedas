"use server";

import {
  bulkProcessParticipantsAction as runBulkProcessParticipantsAction,
  type ParticipantBulkProcessState
} from "@/server/participant-lists";

export async function bulkProcessParticipantsAction(
  state: ParticipantBulkProcessState,
  formData: FormData
) {
  return runBulkProcessParticipantsAction(state, formData);
}
