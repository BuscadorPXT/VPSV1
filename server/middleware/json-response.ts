import { Request, Response, NextFunction } from 'express';

export function ensureJsonResponse(req: Request, res: Response, next: NextFunction) {
  // Override res.json to ensure proper JSON responses
  const originalJson = res.json;
  const originalSend = res.send;

  res.json = function(data) {
    // Ensure content type is set to JSON
    if (!res.get('Content-Type')) {
      res.type('application/json');
    }
    return originalJson.call(this, data);
  };

  res.send = function(data) {
    // If we're sending an object and haven't set content type, make it JSON
    if (typeof data === 'object' && data !== null && !res.get('Content-Type')) {
      res.type('application/json');
      return originalJson.call(this, data);
    }
    return originalSend.call(this, data);
  };

  next();
}