import SkillTag from '../skills/SkillTag.jsx';
import styles from './ExtractedSkillsList.module.css';

export default function ExtractedSkillsList({ skills = [] }) {
  if (!skills.length) return null;
  return (
    <div className={styles.list}>
      {skills.map((skill) => <SkillTag key={typeof skill === 'string' ? skill : skill.nom || skill.name} skill={skill} />)}
    </div>
  );
}
