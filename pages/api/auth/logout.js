import { clearSession } from '../../../lib/auth';
import { withJsonErrors } from '../../../lib/api-wrapper';

export default withJsonErrors(function handler(req, res) {
  clearSession(res);
  res.status(200).json({ ok: true });
});
