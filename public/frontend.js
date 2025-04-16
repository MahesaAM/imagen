document.getElementById('imageForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const promptText = document.getElementById('prompt').value.trim();
    if (!promptText) {
        alert('Please enter at least one prompt.');
        return;
    }

    const prompts = promptText.split('\n').filter(line => line.trim() !== '');

    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = 'Generating images... Please wait.';

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompts })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate images');
        }

        const data = await response.json();

        resultDiv.innerHTML = '';

        for (const result of data.results) {
            const promptHeader = document.createElement('h3');
            promptHeader.textContent = `Prompt: ${result.prompt}`;
            resultDiv.appendChild(promptHeader);

            for (const base64Image of result.images) {
                const imageBlob = base64ToBlob(base64Image, 'image/jpeg');
                const imageUrl = URL.createObjectURL(imageBlob);

                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.style.maxWidth = '100%';
                imgElement.style.marginBottom = '10px';
                resultDiv.appendChild(imgElement);

                // Create download link
                const downloadLink = document.createElement('a');
                downloadLink.href = imageUrl;
                downloadLink.download = `image_${Date.now()}.jpg`;
                downloadLink.textContent = 'Download Image';
                downloadLink.style.display = 'block';
                downloadLink.style.marginBottom = '20px';
                resultDiv.appendChild(downloadLink);
            }
        }
    } catch (error) {
        resultDiv.innerHTML = `Error: ${error.message}`;
    }
});

function base64ToBlob(base64, mime) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
}
