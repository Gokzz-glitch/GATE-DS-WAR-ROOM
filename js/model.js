const RankPredictor = (function() {
    let model = null;
    let isTraining = false;

    // We will generate some synthetic training data loosely based on GATE DA logic
    // Inputs: [OverallCompletionPct, AvgQuizScore, CurrentStreak]
    // Output: [PredictedRank] (Normalized 0 to 1, where 1 is Rank 1, and 0 is Rank 10,000+)
    
    function generateMockData() {
        const inputs = [];
        const outputs = [];
        
        for (let i = 0; i < 200; i++) {
            const completion = Math.random(); // 0 to 1
            const score = Math.random();      // 0 to 1
            const streak = Math.min(Math.random() * 30 / 100, 1); // 0 to 0.3 normalized max 30 days
            
            inputs.push([completion, score, streak]);
            
            // Formula for mock rank (closer to 1 = better rank)
            // Weightage: Score (50%), Completion (40%), Streak (10%)
            let rankScore = (score * 0.5) + (completion * 0.4) + (streak * 3.3 * 0.1);
            // Add some noise
            rankScore += (Math.random() * 0.1) - 0.05; 
            rankScore = Math.max(0, Math.min(1, rankScore));
            
            outputs.push([rankScore]);
        }
        
        return {
            xs: tf.tensor2d(inputs),
            ys: tf.tensor2d(outputs)
        };
    }

    async function initAndTrain() {
        if (!window.tf) {
            console.error('TensorFlow.js not loaded');
            return;
        }

        isTraining = true;
        
        // Define a simple sequential neural network
        model = tf.sequential();
        model.add(tf.layers.dense({ units: 8, inputShape: [3], activation: 'relu' }));
        model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' })); // Output between 0 and 1
        
        model.compile({
            optimizer: tf.train.adam(0.05),
            loss: 'meanSquaredError'
        });

        const data = generateMockData();
        
        console.log('Training ML Model for Rank Prediction...');
        await model.fit(data.xs, data.ys, {
            epochs: 50,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    // console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
                }
            }
        });
        
        console.log('ML Model Training Complete.');
        isTraining = false;
        
        // Cleanup tensors
        data.xs.dispose();
        data.ys.dispose();
    }

    async function predictRank(completionPct, avgScore, streak) {
        if (!model || isTraining) return null;
        
        const normCompletion = completionPct / 100;
        const normScore = avgScore / 100;
        const normStreak = Math.min(streak / 30, 1);
        
        const inputTensor = tf.tensor2d([[normCompletion, normScore, normStreak]]);
        const prediction = model.predict(inputTensor);
        const score = await prediction.data();
        
        inputTensor.dispose();
        prediction.dispose();
        
        // Map 0-1 score to an estimated rank (1 to 10,000)
        // 1.0 score = Rank 1. 0.0 score = Rank 10,000
        const rawScore = score[0];
        let estimatedRank = Math.round(10000 - (rawScore * 9999));
        
        return Math.max(1, estimatedRank); // Never worse than 10000, never better than 1
    }

    return {
        initAndTrain,
        predictRank,
        isModelReady: () => model !== null && !isTraining
    };
})();
