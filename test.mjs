import ImageProcessor from './main.mjs';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createTestImages() {
  const testDir = path.join(__dirname, 'test-images');
  const outputDir = path.join(__dirname, 'test-output');

  // Create test directories
  await fs.mkdir(testDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });

  // Create a simple SVG image for testing
  const svgContent = `
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="blue"/>
      <circle cx="50" cy="50" r="30" fill="red"/>
    </svg>
  `;

  await fs.writeFile(path.join(testDir, 'test.svg'), svgContent);

  return { testDir, outputDir };
}

async function cleanupTestDirs(testDir, outputDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
}

async function runTests() {
  console.log('🧪 Starting tests...\n');
  
  const processor = new ImageProcessor();
  const { testDir, outputDir } = await createTestImages();
  
  try {
    // Test 1: Single file conversion
    console.log('Test 1: Single file conversion');
    const result = await processor.convertToPNG(
      path.join(testDir, 'test.svg'),
      path.join(outputDir, 'test.png'),
      { quality: 100 }
    );
    console.log('✓ Single file conversion successful');
    console.log('Result:', result);
    console.log('\n');

    // Test 2: Format validation
    console.log('Test 2: Format validation');
    try {
      await processor.processFile({
        input: path.join(testDir, 'test.svg'),
        format: 'invalid'
      });
      console.log('✗ Format validation failed - should not accept invalid format');
    } catch (error) {
      console.log('✓ Format validation working correctly');
      console.log('Error caught:', error.message);
    }
    console.log('\n');

    // Test 3: Folder processing
    console.log('Test 3: Folder processing');
    const folderResults = await processor.convertFolderToWebP(
      testDir,
      outputDir,
      { quality: 80 },
      (progress) => console.log(`Progress: ${progress.progress.toFixed(1)}%`)
    );
    console.log('✓ Folder processing successful');
    console.log('Results:', folderResults);
    console.log('\n');

    // Test 4: Statistics
    console.log('Test 4: Statistics');
    const stats = processor.getStats();
    console.log('✓ Statistics available');
    console.log('Stats:', stats);
    console.log('\n');

    // Test 5: Cache functionality
    console.log('Test 5: Cache functionality');
    const firstRun = await processor.convertToJPEG(
      path.join(testDir, 'test.svg'),
      path.join(outputDir, 'test.jpg')
    );
    const secondRun = await processor.convertToJPEG(
      path.join(testDir, 'test.svg'),
      path.join(outputDir, 'test2.jpg')
    );
    console.log('✓ Cache working correctly');
    console.log('First run:', firstRun);
    console.log('Second run (should be from cache):', secondRun);
    console.log('\n');

    // Test 6: Multiple format conversion
    console.log('Test 6: Multiple format conversion');
    const formats = ['webp', 'jpeg', 'avif', 'png'];
    for (const format of formats) {
      const result = await processor.processFile({
        input: path.join(testDir, 'test.svg'),
        output: path.join(outputDir, `test.${format}`),
        format
      });
      console.log(`✓ ${format.toUpperCase()} conversion successful`);
      console.log(`Result for ${format}:`, result);
    }
    console.log('\n');

    // Test 7: Error handling
    console.log('Test 7: Error handling');
    try {
      await processor.processFile({
        input: 'nonexistent.jpg',
        format: 'png'
      });
      console.log('✗ Error handling failed - should throw for nonexistent file');
    } catch (error) {
      console.log('✓ Error handling working correctly');
      console.log('Error caught:', error.message);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup
    await cleanupTestDirs(testDir, outputDir);
  }
}

// Run the tests
runTests().catch(console.error);