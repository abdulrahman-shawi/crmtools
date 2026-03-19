import { TrainingManager } from "@/components/hr/training-manager";
import { trainingPrograms, trainingEnrollments } from "@/lib/data/mock-hr";

/**
 * Training and development page - programs and enrollments.
 */
export default function HrTrainingPage() {
  return <TrainingManager initialPrograms={trainingPrograms} initialEnrollments={trainingEnrollments} />;
}
