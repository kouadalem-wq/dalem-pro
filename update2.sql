UPDATE invoices i SET status = 'SENT', "dueDate" = NOW() - INTERVAL '3 days' 
FROM clients c WHERE i."clientId" = c.id AND c.email IS NOT NULL AND i.status = 'PAID';
