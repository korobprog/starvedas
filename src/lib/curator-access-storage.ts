export type CuratorAccessCredentials = {
  email: string;
  password: string;
  referralPath: string;
};

export function getCuratorAccessStorageKey(curatorId: string) {
  return `starvedas:new-curator:${curatorId}`;
}
