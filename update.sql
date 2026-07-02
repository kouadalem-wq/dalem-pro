UPDATE invoices SET status = 'SENT', "dueDate" = NOW() - INTERVAL '5 days' WHERE number = 'FAC-2026-002';
