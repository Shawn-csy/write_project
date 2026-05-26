export interface CurrentUserLike {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
}
