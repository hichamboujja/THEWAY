import { UploadCloud } from 'lucide-react';
import { useRef, useState } from 'react';
import { uploadCV } from '../../api/cvApi.js';
import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import styles from './CVUploadBox.module.css';

export default function CVUploadBox({ onUploaded }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!file) return;
    setLoading(true);
    try {
      const result = await uploadCV(file);
      onUploaded?.(result);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={styles.box}>
      <span className={styles.icon}><UploadCloud size={26} /></span>
      <h3>Importer un CV</h3>
      <p>PDF, DOC ou DOCX selon la configuration backend.</p>
      <input ref={inputRef} type="file" accept=".pdf,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      <Button loading={loading} disabled={!file} onClick={submit}>Uploader</Button>
    </Card>
  );
}
