import { useTranslation } from 'react-i18next';
import type { Program } from '../types';

export function ProgramRepairNotice({ program }: { program: Pick<Program, 'availability'> }) {
  const { t } = useTranslation();
  if (program.availability !== 'repair_required') return null;
  return <p className="text-sm text-error mb-sm" role="status">{t('programs.repairRequired')}</p>;
}
