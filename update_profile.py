import re

with open('frontend/src/components/ProfilePage/ProfilePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add import
import_stmt = "import ImageCropperModal from './ImageCropperModal';\nimport { useRef } from 'react';\n"
if "import ImageCropperModal" not in content:
    content = content.replace('import { Checkbox } from "../ui/checkbox";', 'import { Checkbox } from "../ui/checkbox";\n' + import_stmt)
    content = content.replace('import React, { ChangeEvent, useEffect, useState } from "react";', 'import React, { ChangeEvent, useEffect, useState, useRef } from "react";')

# Update component state and functions
hook_str = "const { user, fetchProfile, updateProfile, loading, uploadProfilePicture } = userAuthStore();\n  const [activeSection, setActiveSection] = useState(\"about\");\n  const [isEditing, setIsEditing] = useState(false);\n  const [isCropperOpen, setIsCropperOpen] = useState(false);\n  const [selectedImageSrc, setSelectedImageSrc] = useState<string>('');\n  const [isUploadingImage, setIsUploadingImage] = useState(false);\n  const fileInputRef = useRef<HTMLInputElement>(null);\n\n  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {\n    if (e.target.files && e.target.files.length > 0) {\n      const file = e.target.files[0];\n      const reader = new FileReader();\n      reader.addEventListener('load', () => {\n        setSelectedImageSrc(reader.result?.toString() || '');\n        setIsCropperOpen(true);\n      });\n      reader.readAsDataURL(file);\n      e.target.value = '';\n    }\n  };\n\n  const handleCropComplete = async (blob: Blob) => {\n    setIsCropperOpen(false);\n    setIsUploadingImage(true);\n    try {\n      const file = new File([blob], 'profile.jpg', { type: 'image/jpeg' });\n      if(uploadProfilePicture) await uploadProfilePicture(file);\n    } catch (error) {\n      console.error('Failed to upload profile picture', error);\n    } finally {\n      setIsUploadingImage(false);\n    }\n  };\n"

if "const [isCropperOpen, setIsCropperOpen]" not in content:
    content = re.sub(
        r'const { user, fetchProfile, updateProfile, loading } = userAuthStore\(\);[\s\n]*const \[activeSection, setActiveSection\] = useState\("about"\);[\s\n]*const \[isEditing, setIsEditing\] = useState\(false\);',
        hook_str,
        content,
        flags=re.MULTILINE
    )

# Replace Avatar section
avatar_replacement = """<div className="flex items-center space-x-8 mb-8">
            <div className="flex flex-col items-center">
              <div 
                className="relative cursor-pointer group" 
                onClick={() => !isUploadingImage && fileInputRef.current?.click()}
              >
                <Avatar className={`w-24 h-24 transition-opacity ${isUploadingImage ? 'opacity-50' : 'group-hover:opacity-80'}`}>
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
          </div>"""

if "fileInputRef" not in content.split("return (")[1]:
    # We replace from `<div className="flex items-center space-x-8 mb-8">` up to `</div>` of that block
    content = re.sub(
        r'<div className="flex items-center space-x-8 mb-8">[\s\S]*?<p className="mt-2 text-lg font-semibold">\{user\?\.name\}</p>\s*</div>\s*</div>',
        avatar_replacement,
        content
    )


# Inject cropper modal at the end before closing tags
modal_injection = """
      <ImageCropperModal 
        isOpen={isCropperOpen} 
        onClose={() => setIsCropperOpen(false)} 
        imageSrc={selectedImageSrc} 
        onCropComplete={handleCropComplete} 
      />
      <FloatingChatWidget />
    </>
"""
if "<ImageCropperModal" not in content:
    content = content.replace("      <FloatingChatWidget />\n    </>", modal_injection)

with open('frontend/src/components/ProfilePage/ProfilePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
