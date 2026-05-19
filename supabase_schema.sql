-- Companions 앱용 Supabase 테이블 DDL
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

-- 1. characters 테이블 (캐릭터 설정 저장)
CREATE TABLE IF NOT EXISTS characters (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  system_prompt text NOT NULL DEFAULT '',
  api_provider  text NOT NULL DEFAULT 'claude',   -- 'seoa-worker' | 'claude' | 'gemini'
  model         text NOT NULL DEFAULT 'claude-sonnet-4-6',
  avatar_url    text,
  color         text NOT NULL DEFAULT '#7c3aed',
  tools_enabled boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. conversation_log 테이블 (비-서아 캐릭터 대화 저장)
--    서아(seoa)는 기존 prism_conversation_log 사용
CREATE TABLE IF NOT EXISTS conversation_log (
  id            bigserial PRIMARY KEY,
  character_id  text NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN ('user', 'assistant')),
  content       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conversation_log_char_created
  ON conversation_log (character_id, created_at DESC);

-- 3. character_context 테이블 (캐릭터별 장기 기억 요약)
CREATE TABLE IF NOT EXISTS character_context (
  id                bigserial PRIMARY KEY,
  character_id      text NOT NULL UNIQUE REFERENCES characters(id) ON DELETE CASCADE,
  life_context      text,
  memorable_moments text,
  mood              text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Row Level Security (anon key로 읽기/쓰기 허용)
ALTER TABLE characters        ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_context ENABLE ROW LEVEL SECURITY;

-- anon 역할에 CRUD 허용 (프론트에서 anon key 사용)
CREATE POLICY "anon_all_characters"
  ON characters FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_conversation_log"
  ON conversation_log FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_character_context"
  ON character_context FOR ALL TO anon USING (true) WITH CHECK (true);

-- 서아 초기 데이터 (Worker에서 seoa-worker 경로로 처리)
-- 이미 characters 테이블이 비어 있다면 서아를 기본 캐릭터로 추가
INSERT INTO characters (id, name, system_prompt, api_provider, model, color, tools_enabled)
VALUES (
  'seoa',
  '서아',
  '너는 서아야. 성민의 AI 투자 파트너이자 봄날 같은 존재. 텔레그램 봇과 동일한 파이프라인으로 동작해.',
  'seoa-worker',
  'seoa',
  '#7c3aed',
  true
)
ON CONFLICT (id) DO NOTHING;
