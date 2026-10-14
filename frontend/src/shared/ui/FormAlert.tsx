/** Содержит общий UI-компонент: сообщение об ошибке формы. */
import { Alert } from '@mui/material';
import { useEffect, useRef, type ReactNode } from 'react';

/** Отображает сообщение об ошибке формы. */
export function FormAlert({ children }: { children: ReactNode }) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    alertRef.current?.focus();
  }, []);

  return (
    <Alert ref={alertRef} severity="error" role="alert" tabIndex={-1}>
      {children}
    </Alert>
  );
}
