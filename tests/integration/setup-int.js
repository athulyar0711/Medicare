import { afterAll, beforeAll } from 'vitest';
import { closeDB } from '../setup.js';
import nock from 'nock';

beforeAll(() => {
    // Intercept Google GenAI API calls
    nock('https://generativelanguage.googleapis.com')
        .persist()
        .post(/.*generateContent.*/)
        .reply(200, {
            candidates: [
                {
                    content: {
                        parts: [
                            { text: '{"summary": "Mocked AI Response", "blood_sugar": 95, "vitamin_d": 32}' }
                        ]
                    }
                }
            ]
        });
});

afterAll(async () => {
    nock.cleanAll();
    await closeDB();
});
