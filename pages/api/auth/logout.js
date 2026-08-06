import { clearSession } from '../../../lib/auth';

export default function handler(req, res) {
  clearSession(res);
  res.status(200).json({ ok: true });
}
