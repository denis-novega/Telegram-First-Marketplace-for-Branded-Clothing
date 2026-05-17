export const revalidate = 0;
export const dynamic = 'force-dynamic';
export const fetchCache = 'default-no-store';

import EditMini from './page.client';

export default function Page() {
  return <EditMini />;
}
