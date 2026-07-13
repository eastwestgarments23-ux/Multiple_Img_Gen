// script.js

let base64ImagesArray = []; 
let selectedModelId = null; 
let globalZipRegistry = []; 

// 1. Processing Multi-Image Input Uploader
const imageUpload = document.getElementById('imageUpload');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');

imageUpload.addEventListener('change', async (event) => {
    imagePreviewContainer.innerHTML = '';
    base64ImagesArray = []; 

    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const container = document.createElement('div');
            container.className = 'preview-container';
            
            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'preview-img';
            container.appendChild(img);
            imagePreviewContainer.appendChild(container);

            const base64Data = e.target.result.split(',')[1];
            base64ImagesArray.push({
                id: i + 1,
                name: file.name.split('.')[0],
                mimeType: file.type,
                data: base64Data
            });
        };
        reader.readAsDataURL(file);
    }
});

// 2. UI Filtering: Ethnicity Dropdown
const ethnicityFilter = document.getElementById('ethnicityFilter');
const modelContainers = document.querySelectorAll('.model-container');

ethnicityFilter.addEventListener('change', (e) => {
    const selectedEth = e.target.value;
    
    modelContainers.forEach(container => {
        const radioBtn = container.querySelector('.model-radio');
        
        if (selectedEth === 'all' || selectedEth === '' || container.dataset.ethnicity === selectedEth) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
            if (radioBtn && radioBtn.checked) {
                radioBtn.checked = false;
                selectedModelId = null;
            }
        }
    });
});

// 3. Single Model Radio Selection Logic
const modelRadios = document.querySelectorAll('.model-radio');
modelRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.checked) {
            selectedModelId = e.target.dataset.model;
        }
    });
});

// Helpers
function getBase64FromImageElement(imgElement) {
    const canvas = document.createElement("canvas");
    canvas.width = imgElement.naturalWidth || imgElement.width || 120;
    canvas.height = imgElement.naturalHeight || imgElement.height || 160;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/jpeg");
    return dataURL.split(',')[1];
}

function triggerIndividualDownload(blobUrl, filename) {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function convertBase64ToBlob(base64Data, mimeType = 'image/png') {
    const rawBinary = atob(base64Data);
    const binaryLength = rawBinary.length;
    const bytesBuffer = new Uint8Array(binaryLength);
    for (let i = 0; i < binaryLength; i++) {
        bytesBuffer[i] = rawBinary.charCodeAt(i);
    }
    return new Blob([bytesBuffer], { type: mimeType });
}

// 4. Matrix Generation Engine (Single Model Execution)
const generateBtn = document.getElementById('generateBtn');
const resultsContainer = document.getElementById('resultsContainer');
const downloadZipBtn = document.getElementById('downloadZipBtn');

generateBtn.addEventListener('click', async () => {
    if (base64ImagesArray.length === 0) {
        alert("Please upload at least one product image.");
        return;
    }
    if (!selectedModelId) {
        alert("Please select a Model Array.");
        return;
    }
    
    resultsContainer.innerHTML = '';
    downloadZipBtn.style.display = 'none';
    generateBtn.disabled = true;
    generateBtn.innerText = "Processing Matrix Generations sequentially...";
    globalZipRegistry = [];

    const modelId = selectedModelId;
    const modelWrapper = document.getElementById(`model-wrapper-${modelId}`);
    const specificEthnicity = modelWrapper ? modelWrapper.dataset.ethnicity : "mixed";

    // 🔥 FIX: Dynamically find exactly how many poses exist in the HTML for this specific model
    const availablePoseImages = document.querySelectorAll(`.pose-img[data-model="${modelId}"]`);

    const modelResultGroup = document.createElement('div');
    modelResultGroup.className = 'model-result-group';
    
    const groupHeader = document.createElement('div');
    groupHeader.className = 'result-group-header';
    groupHeader.innerHTML = `
        <h4 style="margin:0; font-size:16px; color:#2d3748;">Model ${modelId} Output Sets</h4>
    `;
    modelResultGroup.appendChild(groupHeader);
    resultsContainer.appendChild(modelResultGroup);

    for (const inputImageObj of base64ImagesArray) {
        const inputImageBlock = document.createElement('div');
        inputImageBlock.className = 'input-image-block';
        
        const blockHeader = document.createElement('div');
        blockHeader.style.display = 'flex';
        blockHeader.style.justifyContent = 'space-between';
        blockHeader.style.alignItems = 'center';
        blockHeader.style.marginBottom = '10px';
        blockHeader.innerHTML = `
            <div class="input-image-title" style="margin-bottom: 0;">Source Input: ${inputImageObj.name}</div>
            <button class="btn-zip-model" id="btn-zip-${modelId}-${inputImageObj.id}" style="padding: 6px 12px; font-size: 12px; background: #4a5568;">📦 Download Array (.ZIP)</button>
        `;
        inputImageBlock.appendChild(blockHeader);
        
        const cardsGrid = document.createElement('div');
        cardsGrid.className = 'results-grid';
        inputImageBlock.appendChild(cardsGrid);
        modelResultGroup.appendChild(inputImageBlock);

        // 🔥 FIX: Loop exactly the number of times as there are images for this model
        for (const poseImgNode of availablePoseImages) {
            const poseId = poseImgNode.dataset.pose;
            const outputFileName = `Model_${modelId}_Pose_${poseId}_${inputImageObj.name}.png`;

            let poseBase64Data = "";
            try {
                poseBase64Data = getBase64FromImageElement(poseImgNode);
            } catch (err) {
                console.warn(`Could not extract base64 for Model ${modelId} Pose ${poseId}`, err);
                continue; // Skip this pose entirely if the image is broken/missing
            }

            const placeholderCard = document.createElement('div');
            placeholderCard.className = 'result-card';
            placeholderCard.innerHTML = `<div style="padding:100px 10px; text-align:center; background:#edf2f7; border-radius:4px; font-size:12px; color:#4a5568;">Generating: Pose ${poseId}...<br><small>(Waiting for AI)</small></div>`;
            cardsGrid.appendChild(placeholderCard);

            try {
                let apiGatewayResponse;
                try {
                    apiGatewayResponse = await fetch('http://localhost:3000/api/generate-pose', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            base64Image: inputImageObj.data,
                            mimeType: inputImageObj.mimeType,
                            sourceName: inputImageObj.name,
                            poseBase64: poseBase64Data,
                            poseMimeType: 'image/jpeg',
                            modelId: modelId,
                            poseId: poseId,
                            ethnicity: specificEthnicity
                        })
                    });
                } catch (networkErr) {
                    throw new Error("Backend server unreachable. Make sure you run 'node server.js' first.");
                }

                const parsedResponseData = await apiGatewayResponse.json();

                if (!apiGatewayResponse.ok || parsedResponseData.error) {
                    throw new Error(parsedResponseData.error || "Server responded with an error.");
                }

                const finalizedImageBlob = convertBase64ToBlob(parsedResponseData.image_base64, parsedResponseData.mime_type);
                const actionableBlobUrl = URL.createObjectURL(finalizedImageBlob);

                globalZipRegistry.push({
                    modelId: modelId,
                    sourceName: inputImageObj.name,
                    filename: outputFileName,
                    blob: finalizedImageBlob
                });

                placeholderCard.innerHTML = `
                    <img src="${actionableBlobUrl}" class="result-img" alt="Generated Pose ${poseId}">
                    <a class="btn-download" href="javascript:void(0)">⬇️ Download Image</a>
                `;
                
                placeholderCard.querySelector('.btn-download').addEventListener('click', () => {
                    triggerIndividualDownload(actionableBlobUrl, outputFileName);
                });

            } catch (processingError) {
                console.error("Matrix Processing Error:", processingError);
                placeholderCard.innerHTML = `<div style="padding:20px; color:#e53e3e; font-size:12px; font-weight:bold;">Failed:<br>${processingError.message}</div>`;
            }
        }

        // Bind the click event for this specific Source Input array's ZIP button
        document.getElementById(`btn-zip-${modelId}-${inputImageObj.id}`).addEventListener('click', () => {
            const localizedSourceZip = new JSZip();
            const isolatedFilterData = globalZipRegistry.filter(item => item.modelId === modelId && item.sourceName === inputImageObj.name);
            
            if (isolatedFilterData.length === 0) {
                alert(`No generated content is available to compile for this array yet.`);
                return;
            }
            isolatedFilterData.forEach(fileMeta => {
                localizedSourceZip.file(fileMeta.filename, fileMeta.blob);
            });
            localizedSourceZip.generateAsync({ type: "blob" }).then((compiledContent) => {
                const systemBlobUrl = URL.createObjectURL(compiledContent);
                triggerIndividualDownload(systemBlobUrl, `Model_${modelId}_${inputImageObj.name}_Array.zip`);
            });
        });
    }

    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Outputs";
    if (globalZipRegistry.length > 0) {
        downloadZipBtn.style.display = 'block';
    }
});

// 5. Global ZIP Binding
downloadZipBtn.addEventListener('click', () => {
    const primaryMasterZipInstance = new JSZip();
    globalZipRegistry.forEach(fileMeta => {
        const virtualDirectory = primaryMasterZipInstance.folder(`Model_${fileMeta.modelId}`);
        virtualDirectory.file(fileMeta.filename, fileMeta.blob);
    });
    primaryMasterZipInstance.generateAsync({ type: "blob" }).then((compiledMasterContent) => {
        const globalSystemBlobUrl = URL.createObjectURL(compiledMasterContent);
        triggerIndividualDownload(globalSystemBlobUrl, "All_Generated_Models_Matrix_Output.zip");
    });
});