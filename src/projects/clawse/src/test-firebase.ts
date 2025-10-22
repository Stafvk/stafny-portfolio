import { initializeFirebase, getFirestore, FieldValue } from './config/firebase';

async function testFirebase() {
  console.log('🔥 Testing Firebase connection...\n');
  
  try {
    // Initialize Firebase
    initializeFirebase();
    const db = getFirestore();
    
    // Test write
    console.log('📝 Testing Firestore write...');
    const testDoc = await db.collection('test').add({
      message: 'Firebase connected successfully!',
      timestamp: FieldValue.serverTimestamp(),
      test_data: {
        number: 42,
        boolean: true,
        array: ['item1', 'item2', 'item3'],
        nested: {
          key: 'value',
          count: 100
        }
      }
    });
    
    console.log('✅ Document written with ID:', testDoc.id);
    
    // Test read
    console.log('📖 Testing Firestore read...');
    const doc = await testDoc.get();
    const data = doc.data();
    
    if (data) {
      console.log('✅ Document data retrieved:');
      console.log('   Message:', data.message);
      console.log('   Test number:', data.test_data.number);
      console.log('   Test array:', data.test_data.array);
    }
    
    // Test update
    console.log('🔄 Testing Firestore update...');
    await testDoc.update({
      message: 'Firebase connection test completed!',
      updated_at: FieldValue.serverTimestamp(),
      'test_data.count': FieldValue.increment(50)
    });
    
    const updatedDoc = await testDoc.get();
    const updatedData = updatedDoc.data();
    console.log('✅ Document updated successfully');
    console.log('   Updated message:', updatedData?.message);
    console.log('   Updated count:', updatedData?.test_data.count);
    
    // Test query
    console.log('🔍 Testing Firestore query...');
    const querySnapshot = await db.collection('test')
      .where('test_data.number', '==', 42)
      .limit(5)
      .get();
    
    console.log(`✅ Query returned ${querySnapshot.size} documents`);
    
    // Test batch operations
    console.log('📦 Testing Firestore batch operations...');
    const batch = db.batch();
    
    // Create multiple test documents
    for (let i = 1; i <= 3; i++) {
      const docRef = db.collection('test_batch').doc(`test_${i}`);
      batch.set(docRef, {
        name: `Test Document ${i}`,
        value: i * 10,
        created_at: FieldValue.serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log('✅ Batch write completed (3 documents)');
    
    // Verify batch write
    const batchQuery = await db.collection('test_batch').get();
    console.log(`✅ Batch verification: ${batchQuery.size} documents found`);
    
    // Cleanup test documents
    console.log('🧹 Cleaning up test documents...');
    
    // Delete original test document
    await testDoc.delete();
    
    // Delete batch test documents
    const cleanupBatch = db.batch();
    batchQuery.docs.forEach(doc => {
      cleanupBatch.delete(doc.ref);
    });
    await cleanupBatch.commit();
    
    console.log('✅ Test documents cleaned up');
    
    // Final verification
    const finalCount = await db.collection('test').get();
    const finalBatchCount = await db.collection('test_batch').get();
    
    console.log('\n🎉 FIREBASE TEST COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Write operations: Working');
    console.log('✅ Read operations: Working');
    console.log('✅ Update operations: Working');
    console.log('✅ Query operations: Working');
    console.log('✅ Batch operations: Working');
    console.log('✅ Delete operations: Working');
    console.log(`✅ Cleanup verified: ${finalCount.size + finalBatchCount.size} documents remaining`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Firebase test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('1. Check your .env file has correct Firebase credentials');
    console.log('2. Ensure FIREBASE_PRIVATE_KEY has proper newline escaping');
    console.log('3. Verify your Firebase project exists and Firestore is enabled');
    console.log('4. Check that your service account has proper permissions');
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFirebase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testFirebase };
