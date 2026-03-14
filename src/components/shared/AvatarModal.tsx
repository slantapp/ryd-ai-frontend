import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Webcam from "react-webcam";
import AvatarEditor from "react-avatar-editor";

interface AvatarDialogProps {
  value: string | null;
  onChange: (avatar: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function AvatarDialog({ 
  value, 
  onChange, 
  size = "md",
  className 
}: AvatarDialogProps) {
  const [open, setOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [image, setImage] = useState<string | null>(null); // uploaded or webcam image
  const [scale, setScale] = useState(1.2);
  const editorRef = useRef<AvatarEditor | null>(null);
  const webcamRef = useRef<Webcam>(null);

  const handleSave = () => {
    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas().toDataURL();
      onChange(canvas);
      setOpen(false);
      setImage(null);
    }
  };

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-[120px] h-[120px]",
  };

  const editIconSize = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={`relative cursor-pointer ${className || ""}`}>
          <img
            src={value || "/images/avatar-placeholder.png"}
            alt="profile"
            className={`${sizeClasses[size]} rounded-full object-cover border border-white`}
          />
          <span className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm">
            <img src="/icons/edit.svg" alt="edit" className={editIconSize[size]} />
          </span>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Choose an Avatar
          </DialogTitle>
          <p className="text-sm text-gray-500">Which would you prefer to use</p>
        </DialogHeader>

        <Tabs defaultValue="boy" className="w-full mt-4">
          <TabsList className="grid grid-cols-3 w-fit bg-inherit font-solway mb-4">
            <TabsTrigger value="boy">Boy</TabsTrigger>
            <TabsTrigger value="girl">Girl</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>

          {/* Boy Avatars */}
          <TabsContent value="boy" className="grid grid-cols-4 gap-4">
            {[
              "Liam",
              "Paul",
              "Oliver",
              "Elijah",
              "James",
              "William",
              "Benjamin",
              "Lucas",
              "Henry",
              "Alexander",
              "Jackson",
              "Jerry",
            ].map((seed, i) => (
              <img
                key={i}
                src={`https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                alt={`boy-${i}`}
                className={`w-16 h-16 rounded-full border cursor-pointer hover:scale-110 transition ${
                  value ===
                  `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                    ? "ring-2 ring-purple-500"
                    : ""
                }`}
                onClick={() => {
                  onChange(
                    `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                  );
                  setOpen(false);
                }}
              />
            ))}
          </TabsContent>

          {/* Girl Avatars */}
          <TabsContent value="girl" className="grid grid-cols-4 gap-4">
            {[
              "Olivia",
              "Emma",
              "Ava",
              "Sophia",
              "Isabella",
              "Mia",
              "Amelia",
              "Harper",
              "Evelyn",
              "Abigail",
              "Emily",
              "Ella",
            ].map((seed, i) => (
              <img
                key={i}
                src={`https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`}
                alt={`girl-${i}`}
                className={`w-16 h-16 rounded-full border cursor-pointer hover:scale-110 transition ${
                  value ===
                  `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                    ? "ring-2 ring-purple-500"
                    : ""
                }`}
                onClick={() => {
                  onChange(
                    `https://api.dicebear.com/9.x/avataaars/png?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                  );
                  setOpen(false);
                }}
              />
            ))}
          </TabsContent>

          {/* Upload / Camera */}
          <TabsContent value="upload" className="space-y-4">
            {!image && !showCamera && (
              <>
                {/* Upload from device */}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () =>
                        setImage(
                          typeof reader.result === "string"
                            ? reader.result
                            : null
                        );
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                {/* Take a picture */}
                <Button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="w-full"
                >
                  Take a Picture
                </Button>
              </>
            )}

            {/* Camera View */}
            {showCamera && !image && (
              <div className="flex flex-col items-center space-y-2">
                <Webcam
                  audio={false}
                  screenshotFormat="image/jpeg"
                  ref={webcamRef}
                  className="rounded-lg border"
                  videoConstraints={{ facingMode: "user" }}
                />
                <Button
                  onClick={() => {
                    const imgSrc =
                      webcamRef.current && webcamRef.current.getScreenshot
                        ? webcamRef.current.getScreenshot()
                        : null;
                    if (imgSrc) {
                      setImage(imgSrc);
                      setShowCamera(false);
                    }
                  }}
                  className="w-full"
                >
                  Capture
                </Button>
              </div>
            )}

            {/* Avatar Editor */}
            {image && (
              <div className="flex flex-col items-center space-y-4">
                <AvatarEditor
                  ref={editorRef}
                  image={image}
                  width={200}
                  height={200}
                  border={50}
                  borderRadius={100}
                  scale={scale}
                  className="rounded-lg"
                />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setImage(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>Save Avatar</Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
