export type MemeTemplate = {
  id: string;
  name: string;
  url: string;
  boxCount: number;
};

export type CustomText = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
};

export type MintResult = {
  success: boolean;
  transactionHash?: string;
  error?: string;
};