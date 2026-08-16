export type SubmissionMetadata = {
  url: string;
  hostname: string;
  title: string | null;
  description: string | null;
  openGraphTitle: string | null;
  openGraphDescription: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  canonicalUrl: string | null;
  siteName: string | null;
};

export type Submission = Omit<SubmissionMetadata, "hostname"> & {
  id: string;
  ownerUserId: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
};

export type PublicSubmission = Omit<Submission, "ownerUserId">;

export type PublicChatGPTUser = {
  displayName: string;
};
