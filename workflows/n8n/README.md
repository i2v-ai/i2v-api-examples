# i2v.ai n8n templates

Import `product-image.json` or `reference-video.json` into n8n. Both templates use built-in nodes.

1. Create a **Header Auth** credential. Set the header name to `Authorization` and its value to `Bearer YOUR_I2V_API_KEY`.
2. Select that credential in **Quote exact inputs**, **Submit original operation**, **Recover original receipt**, and **Read the same task**.
3. Enter the actual prompt in **Request and approval**. The video template also accepts a verified HTTPS `referenceImageUrl`. Use the [asset upload guide](https://i2v.ai/docs/media-workflow) when the reference starts as a local file.
4. Run with `approved: false`. Read the USD maximum returned by **Stop after the quote**. This run creates no task.
5. When you approve the amount, set a decimal string in `maxCostUsd`, set `approved: true`, and provide a unique random operation ID. Re-run the workflow. It obtains a fresh quote and submits only within the ceiling.
6. Save the returned task ID and operation ID. The template checks the same task up to 24 times. For a task that is still running, query the same task again with the [status endpoint](https://i2v.ai/docs/api). A lost submit response routes to the original receipt using that operation ID. Keep the IDs and original request before retrying.

The template returns the result URL and status. Add the destination step your workflow needs. Store any long-lived output in storage you control. Restrict the execution history to authorized users because it can contain prompts, signed reference URLs, and output URLs. Keep the API key in n8n Credentials.
