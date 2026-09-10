import {
  hasCompleteBookingDetails,
  parseBookingDetails,
  type BookingDetails
} from "./chatbot.intents";

export type CompleteBookingDetails = Required<BookingDetails>;

export const getCompleteBookingDetails = (
  text: string
): CompleteBookingDetails | undefined => {
  const details = parseBookingDetails(text);

  return hasCompleteBookingDetails(details) ? details : undefined;
};
