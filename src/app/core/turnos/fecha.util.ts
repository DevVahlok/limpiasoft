export function horasEntre(inicio: string, fin: string): number {
  const [hI, mI] = inicio.split(':').map(Number);
  const [hF, mF] = fin.split(':').map(Number);
  return (hF * 60 + mF - (hI * 60 + mI)) / 60;
}

export function mesActualIso(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

export function rangoDelMes(mes: string): { desde: string; hasta: string } {
  const [anio, mesNum] = mes.split('-').map(Number);
  const ultimoDia = new Date(anio, mesNum, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, '0')}` };
}
