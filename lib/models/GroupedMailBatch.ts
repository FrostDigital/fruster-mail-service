export default interface GroupedMailBatch {
	email: string;
	key: string;
	batchLevel: number;
	timeoutDate: Date;
	created: Date;
}
