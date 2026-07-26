# Azure GPT Tutor Design

## Goal

Move the child-facing tutor and lesson judge to the existing Volaura Azure OpenAI deployment while retaining an independent, fail-closed safety layer and bounded per-turn spend.

## Approved design

- `AZURE_OPENAI_KEY` is the preferred Azure credential; `AZURE_OPENAI_KEY2` is a key-rotation fallback.
- `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and `AZURE_OPENAI_API_VERSION` define the Azure OpenAI deployment. No key is stored in source code or printed by tests/logs.
- Tutor generation and lesson judging use Azure GPT when all Azure settings are present. Gemini remains the preferred secondary child-safety classifier, and NVIDIA Llama Guard remains an optional primary classifier with the existing fail-closed Gemini fallback.
- Existing output moderation remains mandatory before a tutor reply reaches a child. Azure GPT is never used as the sole safety decision maker.
- The Azure deployment is currently `gpt-4o`. Its per-call output budgets stay bounded at the existing 120 tokens for judge calls and 150 tokens for tutor calls; no SDK retries are enabled. A future dedicated budget deployment can be selected without a source change through `AZURE_OPENAI_DEPLOYMENT`.
- Parent consent must disclose Microsoft Azure OpenAI as a processor for the tutor and lesson judge. The consent version is incremented so existing consents do not silently cover the new processor.

## Out of scope

- DeepSeek integration.
- A new Azure model deployment or billing-account change.
- Weakening consent, rate limits, input/output moderation, or data minimisation.

## Acceptance criteria

1. Azure routing is selected only when all required Azure settings are non-placeholder values; otherwise current Gemini routing remains intact.
2. Key rotation works: the secondary Azure key is used only when the primary key is unavailable.
3. GPT tutor and judge calls use the configured deployment name and do not exceed their current output-token budgets.
4. Consent text names Microsoft Azure OpenAI; stale prior-version consent fails closed.
5. Tests prove Azure precedence, fallback behaviour, consent-version invalidation, safety routing preservation, build and live production checks.
