import {
  listDirectoryPatients,
  listDirectoryTherapists
} from "./directory.repository";

export const fetchDirectory = async () => {
  const [patients, therapists] = await Promise.all([
    listDirectoryPatients(),
    listDirectoryTherapists()
  ]);

  return {
    patients: patients.map((patient) => ({
      id: patient.id,
      fullName: patient.fullName,
      whatsappPhone: patient.whatsappPhone,
      birthdate: patient.birthdate
        ? patient.birthdate.toISOString().slice(0, 10)
        : null,
      status: patient.status,
      preferredModality: patient.preferredModality,
      email: patient.email,
      notes: patient.notes,
      assignedTherapistId: patient.assignedTherapistId
    })),
    therapists: therapists.map((therapist) => ({
      id: therapist.id,
      fullName: therapist.user.fullName,
      email: therapist.user.email,
      isActive: therapist.isActive
    }))
  };
};
