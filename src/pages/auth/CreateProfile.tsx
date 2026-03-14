import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import AvatarDialog from "@/components/shared/AvatarModal";

const validationSchema = Yup.object({
  firstName: Yup.string().required("First name is required"),
  lastName: Yup.string().required("Last name is required"),
  dob: Yup.date().required("Date of birth is required"),
  avatar: Yup.string().required("Please select an avatar"),
});

export default function WardDetailsForm() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="max-w-[29rem] mx-auto bg-white rounded-2xl shadow p-8 space-y-6">
        {/* Header */}
        <div className="text-left">
          <img src="/images/logo.png" alt="logo" className="mx-auto w-20" />
          <h2 className="font-bold text-[20px] mt-4 font-solway">
            Ward Details
          </h2>
          <p className="text-sm text-[#6B767E] font-sans-serifbookflf">
            Get up and running in 3 minutes. A quick guide to get you started
          </p>
        </div>

        <Formik
          initialValues={{
            firstName: "",
            lastName: "",
            dob: undefined,
            avatar: "",
          }}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            console.log("Form Submitted:", values);
            alert("✅ Submitted successfully!");
          }}
        >
          {({ setFieldValue, values }) => (
            <Form className="space-y-6">
              {/* Avatar Picker */}
              <div className="flex justify-center">
                <AvatarDialog
                  value={values.avatar}
                  onChange={(val) => setFieldValue("avatar", val)}
                />
              </div>
              <ErrorMessage
                name="avatar"
                component="div"
                className="text-red-500 text-sm text-center"
              />

              {/* First Name */}
              <div>
                <label className="text-sm font-medium">First Name</label>
                <Field
                  name="firstName"
                  as={Input}
                  className="w-full h-[50px] rounded-[10px] focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Legal First Name"
                />
                <ErrorMessage
                  name="firstName"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="text-sm font-medium">Last Name</label>
                <Field
                  name="lastName"
                  as={Input}
                  className="w-full h-[50px] rounded-[10px] focus-visible:ring-1 focus-visible:ring-primary"
                  placeholder="Legal Last Name"
                />
                <ErrorMessage
                  name="lastName"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* DOB */}
              <div>
                <label className="text-sm font-medium">Date of Birth</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-between text-left font-normal h-[50px] bg-transparent ${
                        !values.dob ? "text-muted-foreground" : ""
                      }`}
                    >
                      {values.dob
                        ? format(values.dob, "dd-MM-yyyy")
                        : "dd - mm - yyyy"}
                      <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={values.dob}
                      onSelect={(date) => setFieldValue("dob", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <ErrorMessage
                  name="dob"
                  component="div"
                  className="text-red-500 text-sm"
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/80 h-[50px] font-sans-serifbookflf text-white"
              >
                Proceed
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
