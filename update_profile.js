const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/ProfilePage/ProfilePage.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importStmt = "import ImageCropperModal from './ImageCropperModal';\nimport { useRef } from 'react';\n";
if (!content.includes("import ImageCropperModal")) {
    content = content.replace('import { Checkbox } from "../ui/checkbox";', 'import { Checkbox } from "../ui/checkbox";\n' + importStmt);
    content = content.replace('import React, { ChangeEvent, useEffect, useState } from "react";', 'import React, { ChangeEvent, useEffect, useState, useRef } from "react";');
}

const hookStr = `const { user, fetchProfile, updateProfile, loading, uploadProfilePicture } = userAuthStore();
  const [activeSection, setActiveSection] = useState("about");
  const [isEditing, setIsEditing] = useState(false);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImageSrc(reader.result?.toString() || '');
        setIsCropperOpen(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsCropperOpen(false);
    setIsUploadingImage(true);
    try {
      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });
      if(uploadProfilePicture) await uploadProfilePicture(file);
    } catch (error) {
      console.error('Failed to upload profile picture', error);
    } finally {
      setIsUploadingImage(false);
    }
  };
`;

if (!content.includes("const [isCropperOpen, setIsCropperOpen]")) {
    content = content.replace(
        /const { user, fetchProfile, updateProfile, loading } = userAuthStore\(\);[\s\r\n]*const \[activeSection, setActiveSection\] = useState\("about"\);[\s\r\n]*const \[isEditing, setIsEditing\] = useState\(false\);/g,
        hookStr
    );
}

const avatarReplacement = `<div className="flex items-center space-x-8 mb-8">
            <div className="flex flex-col items-center">
              <div 
                className="relative cursor-pointer group" 
                onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              >
                <Avatar className={\`w-24 h-24 transition-opacity \${isUploadingImage ? 'opacity-50' : 'group-hover:opacity-80'}\`}>
                  <AvatarImage src={user?.profileImage} alt={user?.name} />
                  <AvatarFallback className="bg-green-100 text-green-600 text-2xl font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {!isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 rounded-full transition-opacity">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/jpeg, image/png, image/webp" 
                  onChange={handleFileChange}
                />
              </div>
              <p className="mt-2 text-lg font-semibold">{user?.name}</p>
            </div>
          </div>`;

if (!content.includes("fileInputRef.current?.click()")) {
    content = content.replace(
        /<div className="flex items-center space-x-8 mb-8">[\s\S]*?<p className="mt-2 text-lg font-semibold">\{user\?\.name\}<\/p>\s*<\/div>\s*<\/div>/,
        avatarReplacement
    );
}

const modalInjection = `
      <ImageCropperModal 
        isOpen={isCropperOpen} 
        onClose={() => setIsCropperOpen(false)} 
        imageSrc={selectedImageSrc} 
        onCropComplete={handleCropComplete} 
      />
      <FloatingChatWidget />
    </>
`;

if (!content.includes("<ImageCropperModal")) {
    content = content.replace(/<FloatingChatWidget \/>[\s\r\n]*<\/>/g, modalInjection);
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log("Updated successfully");
