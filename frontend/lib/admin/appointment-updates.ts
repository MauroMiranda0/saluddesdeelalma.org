export const APPOINTMENTS_UPDATED_EVENT = "sda:appointments-updated";

export const notifyAppointmentsUpdated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(APPOINTMENTS_UPDATED_EVENT));
};
