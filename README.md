# Capstone_Project

This is a prototype that we're gonna use for the assignment.

## AI tutor setup

The tutor uses Groq's chat completions API. Create an API key at [GroqCloud](https://console.groq.com/keys), then add it to the ignored `.env.local` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

Restart the Next.js development server after adding the key. The default model is `openai/gpt-oss-20b`; set `GROQ_MODEL` in `.env.local` only if you want to use another model enabled for your Groq account. Keep API keys server-side and never commit them.

Groq's free access is subject to model-specific rate and token limits, so availability is not guaranteed. Tutor responses support Markdown and LaTeX math using `$...$` for inline equations and `$$...$$` for displayed equations.
