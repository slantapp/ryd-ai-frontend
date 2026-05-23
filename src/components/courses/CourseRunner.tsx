import { useParams } from "react-router-dom";
import { getCurriculumBySlug } from "@/data/curriculumData";
import CourseDetails from "./CourseDetails";
import MathCourseDetails from "./math/MathCourseDetails";

export default function CourseRunner() {
  const { exercise } = useParams<{ exercise: string }>();
  const category = exercise
    ? getCurriculumBySlug(exercise)?.curriculum.category
    : undefined;

  if (category === "mathematics") {
    return <MathCourseDetails />;
  }

  return <CourseDetails />;
}
