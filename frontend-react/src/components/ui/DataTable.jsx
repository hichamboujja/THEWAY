import EmptyState from './EmptyState.jsx';
import LoadingState from './LoadingState.jsx';
import styles from './DataTable.module.css';

export default function DataTable({ columns, rows, loading, emptyMessage = 'Aucun resultat' }) {
  if (loading) return <LoadingState label="Chargement du tableau" />;
  if (!rows?.length) return <EmptyState title="Tableau vide" message={emptyMessage} />;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.id_user || row.uid || index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
