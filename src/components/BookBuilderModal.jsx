// ... imports
import { setBookPagesAtom, generatePageId, createBlankTexture, builderDataAtom } from '../store/atoms';

export const BookBuilderModal = ({ isOpen, onClose }) => {
  const [, setBookPages] = useAtom(setBookPagesAtom);
  const [builderData, setBuilderData] = useAtom(builderDataAtom); // Persistent State
  
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen) return null;

  // Helper to update specific fields in atom
  const updateData = (field, value) => {
    setBuilderData(prev => ({ ...prev, [field]: value }));
  };

  // ... processUrl, loadImage, generateLayout remain same ...

  // ... handleBuild uses builderData.urls instead of local 'urls' state ...
  // e.g. const urlList = builderData.urls.match(...)

  return (
     // ... UI Structure
     // Update Inputs to use builderData:
     <input 
        value={builderData.title} 
        onChange={e => updateData('title', e.target.value)} 
     />
     // ... etc for other inputs
  );
};
