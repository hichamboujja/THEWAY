import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Camera, CheckCircle2, LocateFixed, LockKeyhole, Mail, Phone, RotateCcw, Save, ShieldCheck, SlidersHorizontal, Trash2, UserRound } from 'lucide-react';
import { uploadProfilePhoto } from '../../api/filesApi.js';
import { getProfile, updateProfile } from '../../api/profileApi.js';
import PageHeader from '../../components/layout/PageHeader.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useApi } from '../../hooks/useApi.js';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './SettingsPage.module.css';

const PREFS_KEY = 'theway:user-settings-preferences';

const defaultPreferences = {
  remote: true,
  hybrid: true,
  onsite: false,
  emailAlerts: true,
  matchingAlerts: true,
  profileVisible: true,
  weeklyDigest: false
};

export default function SettingsPage() {
  const { data, loading, error, reload } = useApi(loadSettingsProfile, []);
  const { authenticated, refreshSession } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState(null);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}');
      setPreferences({ ...defaultPreferences, ...stored });
    } catch {
      setPreferences(defaultPreferences);
    }
  }, []);

  useEffect(() => {
    if (data?.profile) setForm(normaliseProfile(data.profile));
  }, [data]);

  const profile = form || normaliseProfile(data?.profile);
  const completion = useMemo(() => calculateCompletion(profile), [profile]);
  const initials = getInitials(profile);
  const dirty = Boolean(form && data?.profile && JSON.stringify(normaliseProfile(data.profile)) !== JSON.stringify(profile));

  function updateField(field, value) {
    setSaved(false);
    setSaveError('');
    setForm(current => ({ ...normaliseProfile(current || data), [field]: value }));
  }

  function updatePreference(field, value) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      setSaveError('Preferences locales non sauvegardees par le navigateur.');
    }
  }

  function reset() {
    setSaved(false);
    setSaveError('');
    setForm(normaliseProfile(data?.profile));
  }

  function choosePhoto() {
    fileInputRef.current?.click();
  }

  function removePhoto() {
    updateField('photo', '');
  }

  async function updatePhotoFromFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setSaveError('Format photo invalide: utilise PNG, JPG ou WebP.');
      return;
    }
    if (file.size > 700 * 1024) {
      setSaveError('Photo trop grande: choisis une image de moins de 700 KB.');
      return;
    }
    if (!authenticated) {
      setSaveError('Connecte-toi pour uploader une photo de profil.');
      return;
    }

    setUploadingPhoto(true);
    setSaveError('');
    try {
      const uploaded = await uploadProfilePhoto(file);
      updateField('photo', uploaded.path || uploaded.url || '');
    } catch (error) {
      setSaveError(error.message || 'Impossible d uploader cette photo.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    if (!authenticated) {
      setSaveError('Connecte-toi pour sauvegarder ces parametres dans ton profil.');
      return;
    }
    const photo = preparePhoto(profile.photo);
    if (photo.error) {
      setSaveError(photo.error);
      return;
    }
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      await updateProfile({
        nom: profile.nom,
        prenom: profile.prenom,
        telephone: profile.telephone,
        localisation: profile.localisation,
        photo: photo.value
      });
      await Promise.all([reload(), refreshSession?.()]);
      setSaved(true);
    } catch (error) {
      setSaveError(error.message || 'Impossible d enregistrer les parametres.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader title="Parametres" subtitle="Controle ton profil, tes preferences de matching et la visibilite de ton compte." />
      <form className={styles.page} onSubmit={save}>
        <section className={styles.hero}>
          {!authenticated ? (
            <Card className={styles.previewBanner}>
              <div>
                <strong>Mode preview</strong>
                <p>Connecte-toi pour charger et sauvegarder ton vrai profil.</p>
              </div>
              <Button as={Link} to="/login" variant="secondary">Connexion</Button>
            </Card>
          ) : null}
          <Card className={styles.profileCard}>
            <div className={styles.avatarPanel}>
              <div className={styles.avatarWrap}>
                {profile.photo ? <img src={profile.photo} alt="" /> : <span>{initials}</span>}
              </div>
              <input
                ref={fileInputRef}
                className={styles.photoInput}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={updatePhotoFromFile}
              />
              <div className={styles.photoActions}>
                <Button type="button" variant="secondary" size="sm" icon={Camera} loading={uploadingPhoto} onClick={choosePhoto}>Update photo</Button>
                {profile.photo ? <Button type="button" variant="ghost" size="sm" icon={Trash2} disabled={uploadingPhoto} onClick={removePhoto}>Remove</Button> : null}
              </div>
            </div>
            <div className={styles.profileMeta}>
              <Badge tone={completion.score >= 80 ? 'success' : 'warning'}>{completion.score}% complet</Badge>
              <h2>{[profile.prenom, profile.nom].filter(Boolean).join(' ') || 'Profil candidat'}</h2>
              <p>{profile.email || 'Email non disponible'}</p>
              <div className={styles.progress}><i style={{ width: `${completion.score}%` }} /></div>
              <small>{completion.missing.length ? `A completer: ${completion.missing.join(', ')}` : 'Profil pret pour le matching.'}</small>
            </div>
          </Card>

          <Card className={styles.statusCard}>
            <SettingStatus icon={ShieldCheck} label="Role" value={profile.role || 'user'} />
            <SettingStatus icon={Mail} label="Email" value={profile.email || 'Non disponible'} />
            <SettingStatus icon={CheckCircle2} label="Sauvegarde" value={saved ? 'Modifications enregistrees' : dirty ? 'Changements non sauvegardes' : 'A jour'} />
          </Card>
        </section>

        <div className={styles.grid}>
          <Card className={styles.section}>
            <SectionHeader icon={UserRound} title="Identite" text="Informations visibles dans ton espace candidat." />
            <div className={styles.fieldGrid}>
              <Field label="Prenom" value={profile.prenom} onChange={(value) => updateField('prenom', value)} placeholder="Votre prenom" />
              <Field label="Nom" value={profile.nom} onChange={(value) => updateField('nom', value)} placeholder="Votre nom" />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionHeader icon={LocateFixed} title="Contact et localisation" text="Utilise pour contextualiser les offres et le matching." />
            <div className={styles.fieldGrid}>
              <Field icon={Phone} label="Telephone" value={profile.telephone} onChange={(value) => updateField('telephone', value)} placeholder="+212 ..." />
              <Field icon={LocateFixed} label="Localisation" value={profile.localisation} onChange={(value) => updateField('localisation', value)} placeholder="Casablanca, Rabat, Remote..." />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionHeader icon={SlidersHorizontal} title="Preferences matching" text="Ces preferences sont conservees dans ce navigateur." />
            <div className={styles.toggles}>
              <Toggle label="Remote" checked={preferences.remote} onChange={(value) => updatePreference('remote', value)} />
              <Toggle label="Hybrid" checked={preferences.hybrid} onChange={(value) => updatePreference('hybrid', value)} />
              <Toggle label="On-site" checked={preferences.onsite} onChange={(value) => updatePreference('onsite', value)} />
              <Toggle label="Profil visible" checked={preferences.profileVisible} onChange={(value) => updatePreference('profileVisible', value)} />
            </div>
          </Card>

          <Card className={styles.section}>
            <SectionHeader icon={Bell} title="Notifications" text="Controle les signaux importants de ton espace." />
            <div className={styles.toggles}>
              <Toggle label="Alertes email" checked={preferences.emailAlerts} onChange={(value) => updatePreference('emailAlerts', value)} />
              <Toggle label="Nouveau matching" checked={preferences.matchingAlerts} onChange={(value) => updatePreference('matchingAlerts', value)} />
              <Toggle label="Resume hebdo" checked={preferences.weeklyDigest} onChange={(value) => updatePreference('weeklyDigest', value)} />
            </div>
          </Card>

          <Card className={styles.security}>
            <SectionHeader icon={LockKeyhole} title="Securite" text="Session protegee par cookies HttpOnly et CSRF cote API." />
            <div className={styles.securityGrid}>
              <SettingStatus icon={ShieldCheck} label="Session" value="Active" />
              <SettingStatus icon={LockKeyhole} label="Protection" value="CSRF active" />
              <SettingStatus icon={CheckCircle2} label="Stockage preferences" value="Local browser" />
            </div>
          </Card>
        </div>

        <div className={styles.saveBar}>
          <div>
            <strong>{dirty ? 'Changements en attente' : 'Parametres synchronises'}</strong>
            <p className={saveError ? styles.saveError : ''}>{saveError || (dirty ? 'Enregistre pour mettre a jour ton profil.' : 'Tes informations de profil sont a jour.')}</p>
          </div>
          <div className={styles.saveActions}>
            <Button type="button" variant="secondary" icon={RotateCcw} disabled={!dirty || saving} onClick={reset}>Reset</Button>
            <Button type="submit" icon={Save} loading={saving} disabled={authenticated && !dirty}>Enregistrer</Button>
          </div>
        </div>
      </form>
    </>
  );
}

async function loadSettingsProfile() {
  try {
    return { profile: await getProfile(), preview: false };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      return { profile: createPreviewProfile(), preview: true };
    }
    throw error;
  }
}

function SectionHeader({ icon: Icon, title, text }) {
  return (
    <div className={styles.sectionHeader}>
      <Icon size={19} />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value = '', onChange, placeholder }) {
  return (
    <label className={styles.field}>
      <span>{Icon ? <Icon size={15} /> : null}{label}</span>
      <input value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function SettingStatus({ icon: Icon, label, value }) {
  return (
    <div className={styles.statusItem}>
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function normaliseProfile(profile = {}) {
  return {
    id_user: profile.id_user || profile.id || '',
    prenom: profile.prenom || '',
    nom: profile.nom || '',
    email: profile.email || '',
    telephone: profile.telephone || '',
    localisation: profile.localisation || '',
    photo: profile.photo || '',
    role: profile.role || 'user'
  };
}

function createPreviewProfile() {
  return {
    prenom: 'Candidate',
    nom: 'Preview',
    email: 'login-required@theway.local',
    telephone: '',
    localisation: '',
    photo: '',
    role: 'user'
  };
}

function calculateCompletion(profile) {
  const fields = [
    ['prenom', 'prenom'],
    ['nom', 'nom'],
    ['telephone', 'telephone'],
    ['localisation', 'localisation'],
    ['photo', 'photo']
  ];
  const missing = fields.filter(([field]) => !profile[field]).map(([, label]) => label);
  return { score: Math.round(((fields.length - missing.length) / fields.length) * 100), missing };
}

function getInitials(profile) {
  const value = [profile.prenom, profile.nom].filter(Boolean).map(item => item[0]).join('');
  return (value || 'TW').slice(0, 2).toUpperCase();
}

function preparePhoto(photo) {
  if (!photo) return { value: '' };
  const value = String(photo).trim();
  const safeHttpsURL = /^https:\/\/[^\s"'<>]+$/i.test(value);
  const safeApiFile = /^\/?api\/files\/[A-Za-z0-9-]+$/i.test(value);
  const safeUploadPath = /^\/?assets\/uploads\/[A-Za-z0-9._/-]+$/i.test(value);
  if (!safeHttpsURL && !safeApiFile && !safeUploadPath) {
    return { error: 'Photo invalide: utilise le bouton Update photo ou une URL https valide.' };
  }
  return { value };
}
