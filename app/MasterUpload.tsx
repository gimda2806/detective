'use client';

import { FileUp, Loader2, Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';
import { uploadMasterJson } from './actions';

export function MasterUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState('');
  const [issues, setIssues] = useState<string[]>([]);
  const [uploadedPath, setUploadedPath] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleFile(file?: File) {
    if (!file || isPending) return;

    setStatus('');
    setIssues([]);
    setUploadedPath('');

    startTransition(async () => {
      try {
        const text = await file.text();
        const result = await uploadMasterJson(text);
        setStatus(result.message);
        setIssues(result.issues || []);
        setUploadedPath(result.ok && result.path ? result.path : '');
      } catch {
        setStatus('마스터 파일을 저장하지 못했습니다. 다시 시도해 주세요.');
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    });
  }

  return (
    <section className="upload-panel" aria-label="마스터 업로드">
      <div>
        <p>Master Upload</p>
        <h2>새 사건 마스터 추가</h2>
      </div>

      <label className="upload-drop">
        <input
          accept="application/json,text/plain,.json,.txt"
          disabled={isPending}
          onChange={(event) => handleFile(event.target.files?.[0])}
          ref={fileRef}
          type="file"
        />
        <FileUp aria-hidden="true" size={22} />
        <span>JSON 또는 TXT 마스터 파일 선택</span>
      </label>

      <button
        className="upload-button"
        disabled={isPending}
        onClick={() => fileRef.current?.click()}
        type="button"
      >
        {isPending ? (
          <Loader2 aria-hidden="true" className="spin" size={17} />
        ) : (
          <Upload aria-hidden="true" size={17} />
        )}
        업로드
      </button>

      {status && (
        <div className={`upload-status ${uploadedPath ? 'success' : 'error'}`}>
          <p>
            {status}
            {uploadedPath && <a href={uploadedPath}>바로 시작</a>}
          </p>
          {issues.length > 0 && (
            <ul aria-label="마스터 수정 필요 항목">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
