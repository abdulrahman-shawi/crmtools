import { TrainingManager } from "@/components/hr/training-manager";
import { hrCandidates, hrEmployees, trainingPrograms, trainingEnrollments } from "@/lib/data/mock-hr";

/**
 * Training and development page - programs and enrollments.
 */
export default function HrTrainingPage() {
  return (
    <TrainingManager
      initialPrograms={trainingPrograms}
      initialEnrollments={trainingEnrollments}
      employees={hrEmployees}
      trainees={hrCandidates}
    />
  );
}
